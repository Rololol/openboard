"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { appPath, getAccessToken, lichessFetch } from "@/lib/lichess-client";

type TimeOption = { label: string; time: number; increment: number; detail: string };
const timeOptions: TimeOption[] = [
  { label: "10 + 0", time: 10, increment: 0, detail: "Rapid" },
  { label: "15 + 10", time: 15, increment: 10, detail: "Rapid" },
  { label: "30 + 0", time: 30, increment: 0, detail: "Klassisch" },
];

export default function PlayPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selected, setSelected] = useState("10 + 0");
  const [rated, setRated] = useState(true);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("Wähle deine Bedenkzeit und starte die Suche.");
  const [error, setError] = useState("");
  const [gameId, setGameId] = useState("");
  const eventController = useRef<AbortController | null>(null);
  const seekController = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("openboard-theme");
    if (savedTheme === "light" || savedTheme === "dark") { document.documentElement.dataset.theme = savedTheme; setTheme(savedTheme); }
  }, []);

  useEffect(() => () => {
    eventController.current?.abort();
    seekController.current?.abort();
  }, []);

  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; window.localStorage.setItem("openboard-theme", next); }

  async function startSearch() {
    const option = timeOptions.find((item) => item.label === selected);
    if (!option || searching) return;
    setError("");
    setGameId("");
    if (!getAccessToken()) {
      setError("Bitte zuerst auf der Startseite mit Lichess verbinden.");
      setSearching(false);
      return;
    }
    setSearching(true);
    setStatus("Verbinde den Lichess-Ereignisstream …");

    const events = new AbortController();
    const seek = new AbortController();
    eventController.current = events;
    seekController.current = seek;

    try {
      const eventResponse = await lichessFetch("/api/stream/event", { signal: events.signal });
      if (!eventResponse.ok || !eventResponse.body) {
        const payload = await eventResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Der Ereignisstream konnte nicht geöffnet werden.");
      }

      const reader = eventResponse.body.getReader();
      const decoder = new TextDecoder();
      const listen = async () => {
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event = JSON.parse(line);
                if (event.type === "gameStart" && event.game?.id) {
                  const color = event.game.color === "black" ? "black" : "white";
                  setGameId(event.game.id);
                  setStatus("Gegner gefunden. Öffne dein Spielbrett …");
                  setSearching(false);
                  seekController.current?.abort();
                  eventController.current?.abort();
                  window.location.assign(appPath("/game") + "?gameId=" + event.game.id + "&color=" + color);
                  return;
                }
                if (event.type === "challenge") setStatus("Eine Herausforderung ist eingegangen.");
              } catch { /* Ignore incomplete or non-JSON stream lines. */ }
            }
          }
        } catch { /* Stream is intentionally closed when search ends or is canceled. */ }
      };
      void listen();

      setStatus("Suche nach einem Gegner …");
      const seekResponse = await lichessFetch("/api/board/seek", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          time: String(option.time),
          increment: String(option.increment),
          rated: String(rated),
          variant: "standard",
          color: "random",
        }),
        signal: seek.signal,
      });
      if (!seekResponse.ok) {
        const payload = await seekResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Lichess konnte die Suche nicht starten.");
      }
      if (seekResponse.body) {
        const seekReader = seekResponse.body.getReader();
        while (true) {
          const { done } = await seekReader.read();
          if (done) break;
        }
        if (!events.signal.aborted) {
          setSearching(false);
          setStatus("Die Spielsuche wurde von Lichess beendet.");
          events.abort();
        }
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      if (cause instanceof Error) setError(cause.message);
      setSearching(false);
      setStatus("Spielsuche beendet.");
    }
  }

  function cancelSearch() {
    seekController.current?.abort();
    eventController.current?.abort();
    setSearching(false);
    setStatus("Spielsuche abgebrochen.");
  }

  const currentOption = timeOptions.find((item) => item.label === selected);

  return <div className="play-page">
    <header className="play-header"><a href={appPath("/")} className="back-link">← Openboard</a><span className="eyebrow">LICHESS MATCHMAKING</span><button className="route-theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Helles Theme aktivieren" : "Dunkles Theme aktivieren"}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button></header>
    <main className="play-content">
      <div className="eyebrow">SPIELEN</div>
      <h1>Finde deinen Gegner.</h1>
      <p className="page-intro">Die Spielsuche läuft direkt über die offizielle Lichess Board API. Dein Konto und deine Wertung bleiben bei Lichess.</p>

      <section className="match-card">
        <div className="match-card-title"><div><span className="eyebrow">ZEITKONTROLLE</span><h2>Wähle deine Bedenkzeit</h2></div><span className="match-icon">♟</span></div>
        <div className="time-options">
          {timeOptions.map((option) => <button key={option.label} className={selected === option.label ? "time-option selected" : "time-option"} onClick={() => setSelected(option.label)} disabled={searching}>
            <strong>{option.label}</strong><span>{option.detail}</span>
          </button>)}
        </div>
        <div className="rated-row"><div><strong>Gewertete Partie</strong><small>Beeinflusst deine Lichess-Wertung</small></div><button type="button" role="switch" aria-checked={rated} className={rated ? "switch on" : "switch"} onClick={() => setRated(!rated)} disabled={searching}><span/></button></div>
        <div className="match-summary"><span>Standard · Zufällige Farbe</span><span>{currentOption?.detail ?? "Rapid"}</span></div>
        {!searching ? <button className="find-button" onClick={startSearch}>Gegner suchen <span>→</span></button> : <button className="find-button cancel" onClick={cancelSearch}>Suche abbrechen</button>}
        <div className={error ? "search-status error" : "search-status"}><span className={searching ? "status-dot pulsing" : "status-dot"}/>{error || status}</div>
        {gameId && <div className="found-game"><strong>Partie gefunden</strong><code>{gameId}</code><a href={"https://lichess.org/" + gameId} target="_blank" rel="noreferrer">Partie auf Lichess öffnen ↗</a><small>Die Partie läuft live über Lichess und wird in Openboard angezeigt.</small></div>}
      </section>

      <aside className="api-note"><strong>Warum nur Rapid und Klassisch?</strong><p>Lichess erlaubt die öffentliche Zufallssuche über die Board API für Rapid, Klassisch und Fernschach. Normale Blitz- und Bullet-Zufallssuche ist darüber nicht verfügbar. Openboard zeigt deshalb keine nicht unterstützten Modi an.</p></aside>
    </main>
  </div>;
}
