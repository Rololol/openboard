"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";

type Player = { id?: string; name?: string; rating?: number; title?: string };
type GameFull = { id: string; white: Player; black: Player; initialFen?: string; clock?: { initial: number; increment: number }; state: { moves: string; wtime: number; btime: number; status: string; wdraw?: boolean; bdraw?: boolean } };
type GameState = { moves: string; wtime: number; btime: number; status: string; wdraw?: boolean; bdraw?: boolean };
type ChatMessage = { username: string; text: string };

const glyphs: Record<string,string> = {
  wk:"♔", wq:"♕", wr:"♖", wb:"♗", wn:"♘", wp:"♙",
  bk:"♚", bq:"♛", br:"♜", bb:"♝", bn:"♞", bp:"♟",
};

function makeFen(initialFen: string | undefined, moves: string) {
  const chess = new Chess(initialFen && initialFen !== "startpos" ? initialFen : undefined);
  for (const uci of moves.trim().split(/\s+/).filter(Boolean)) {
    try { chess.move({ from: uci.slice(0,2) as Square, to: uci.slice(2,4) as Square, promotion: (uci[4] || "q") as "q" | "r" | "b" | "n" }); }
    catch { break; }
  }
  return chess.fen();
}

function formatClock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2,"0");
}

function getNotation(initialFen: string | undefined, moves: string) {
  const chess = new Chess(initialFen && initialFen !== "startpos" ? initialFen : undefined);
  const result: { number: number; color: string; san: string }[] = [];
  for (const [index, uci] of moves.trim().split(/\s+/).filter(Boolean).entries()) {
    try {
      const move = chess.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || "q" });
      result.push({ number: Math.floor(index / 2) + 1, color: index % 2 === 0 ? "white" : "black", san: move.san });
    } catch { break; }
  }
  return result;
}

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [full, setFull] = useState<GameFull | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [clockTick, setClockTick] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Verbinde mit der Partie …");
  const [pendingPromotion, setPendingPromotion] = useState<{from:Square;to:Square}|null>(null);
  const streamRef = useRef<AbortController | null>(null);
  const initialFenRef = useRef<string | undefined>(undefined);
  const clockAnchorRef = useRef(Date.now());

  const chess = useMemo(() => new Chess(fen), [fen]);
  const destinations = useMemo(() => {
    if (!selected) return [];
    return chess.moves({ square: selected, verbose: true }).map(move => move.to);
  }, [chess, selected]);
  const notation = useMemo(() => getNotation(full?.initialFen, gameState?.moves ?? ""), [full?.initialFen, gameState?.moves]);

  const consumeStream = useCallback(async () => {
    const controller = new AbortController();
    streamRef.current = controller;
    try {
      const response = await fetch("/api/lichess/game/" + gameId + "/stream", { cache: "no-store", signal: controller.signal });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Partiestream nicht verfügbar.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "gameFull") {
              const next = event as GameFull;
              setFull(next);
              initialFenRef.current = next.initialFen;
              setGameState(next.state);
              clockAnchorRef.current = Date.now();
              setFen(makeFen(next.initialFen, next.state.moves));
              setMessage(next.state.status === "started" ? "Partie läuft" : "Partie beendet");
            } else if (event.type === "gameState") {
              const next = event as GameState;
              setGameState(next);
              clockAnchorRef.current = Date.now();
              setFen(makeFen(initialFenRef.current, next.moves));
              setMessage(next.status === "started" ? "Partie läuft" : "Partie beendet");
            } else if (event.type === "chatLine" && event.room === "player") {
              setChat((items) => [...items.slice(-49), { username: String(event.username || "Spieler"), text: String(event.text || "") }]);
            }
          } catch {
            // Ignore malformed stream events; the next valid state remains authoritative.
          }
        }
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== "AbortError") {
        setError(cause.message);
        setMessage("Verbindung unterbrochen");
      }
    }
  }, [gameId]);

  useEffect(() => {
    setOrientation(new URLSearchParams(window.location.search).get("color") === "black" ? "black" : "white");
    const controller = new AbortController();
    void fetch("/api/lichess/game/" + gameId + "/chat", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : [])
      .then((items) => {
        if (Array.isArray(items)) setChat(items.filter((item) => item && item.room === "player").map((item) => ({ username: String(item.username || "Spieler"), text: String(item.text || "") })).slice(-50));
      })
      .catch(() => undefined);
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 250);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [gameId]);

  useEffect(() => {
    void consumeStream();
    return () => streamRef.current?.abort();
  }, [consumeStream]);

  async function sendMove(from: Square, to: Square, promotion?: string) {
    const current = new Chess(fen);
    const legal = current.moves({ square: from, verbose: true }).find(move => move.to === to);
    if (!legal) { setSelected(null); return; }
    const chosenPromotion = promotion || (legal.promotion ? "q" : undefined);
    const uci = from + to + (chosenPromotion || "");
    setBusy(true);
    setError("");
    setSelected(null);
    try {
      const response = await fetch("/api/lichess/game/" + gameId + "/move", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uci }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Zug konnte nicht gesendet werden.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zug fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  async function chooseSquare(square: Square) {
    if (!full || !gameState || gameState.status !== "started" || busy) return;
    const ownTurn = (orientation === "white" && chess.turn() === "w") || (orientation === "black" && chess.turn() === "b");
    if (!ownTurn) return;
    const piece = chess.get(square);
    const ownPiece = piece && piece.color === (orientation === "white" ? "w" : "b");
    if (!selected) {
      if (ownPiece) setSelected(square);
      return;
    }
    if (selected === square) { setSelected(null); return; }
    const move = chess.moves({ square: selected, verbose: true }).find(item => item.to === square);
    if (move?.promotion) setPendingPromotion({ from: selected, to: square });
    else if (move) await sendMove(selected, square);
    else if (ownPiece) setSelected(square);
    else setSelected(null);
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatText.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/lichess/game/" + gameId + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Nachricht konnte nicht gesendet werden.");
      }
      setChatText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chat-Nachricht fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  async function drawAction(action: "offer" | "accept" | "decline") {
    setBusy(true);
    setError("");
    setActionMessage("");
    try {
      const apiAction = action === "decline" ? "no" : "yes";
      const response = await fetch("/api/lichess/game/" + gameId + "/draw/" + apiAction, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Remis-Aktion fehlgeschlagen.");
      }
      setActionMessage(action === "offer" ? "Remis angeboten." : action === "decline" ? "Remisangebot abgelehnt." : "Remis angenommen.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Remis-Aktion fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  async function resign() {
    if (!window.confirm("Möchtest du diese Partie wirklich aufgeben?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/lichess/game/" + gameId + "/resign", { method: "POST" });
      if (!response.ok) throw new Error("Aufgeben fehlgeschlagen.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Aktion fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  const rows = orientation === "white" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  const cols = orientation === "white" ? ["a","b","c","d","e","f","g","h"] : ["h","g","f","e","d","c","b","a"];
  const player = orientation === "white" ? full?.white : full?.black;
  const opponent = orientation === "white" ? full?.black : full?.white;
  const isYourTurn = gameState?.status === "started" && ((orientation === "white" && chess.turn() === "w") || (orientation === "black" && chess.turn() === "b"));
  const elapsed = gameState?.status === "started" ? Date.now() - clockAnchorRef.current : 0;
  const playerTimeBase = orientation === "white" ? gameState?.wtime : gameState?.btime;
  const opponentTimeBase = orientation === "white" ? gameState?.btime : gameState?.wtime;
  const playerTime = Math.max(0, (playerTimeBase ?? 0) - (isYourTurn ? elapsed : 0));
  const opponentTime = Math.max(0, (opponentTimeBase ?? 0) - (isYourTurn ? 0 : elapsed));
  void clockTick;

  return <div className="game-page">
    <header className="game-topbar"><a href="/play">← Spielsuche</a><span>OPENBOARD <i/> LIVE-PARTIE</span><a href="/">Dashboard</a></header>
    <main className="game-layout">
      <section className="board-column">
        <div className="player-bar opponent-bar"><span className="player-avatar">{opponent?.name?.slice(0,1).toUpperCase() || "?"}</span><div><strong>{opponent?.name || "Gegner"}</strong><small>{opponent?.rating ? opponent.rating + " Elo" : "Lichess-Spieler"}</small></div><strong className="clock">{formatClock(opponentTime ?? 0)}</strong></div>
        <div className="live-board" aria-label="Schachbrett">
          {rows.map(rank => cols.map(file => {
            const square = (file + rank) as Square;
            const piece = chess.get(square);
            const selectedHere = selected === square;
            const legal = destinations.includes(square);
            const lastMove = gameState?.moves?.trim().split(/\s+/).slice(-1)[0];
            const lastSquare = lastMove && (lastMove.slice(0,2) === square || lastMove.slice(2,4) === square);
            const check = piece?.type === "k" && piece.color === chess.turn() && chess.isCheck();
            return <button key={square} className={["board-square",((file.charCodeAt(0)-97+rank)%2===0)?"dark":"light",selectedHere?"selected":"",legal?"legal":"",lastSquare?"last-move":"",check?"in-check":""].filter(Boolean).join(" ")} onClick={() => void chooseSquare(square)} disabled={!full || busy || gameState?.status !== "started"}>
              {piece && <span className={"piece " + (piece.color === "w" ? "white-piece" : "black-piece")}>{glyphs[piece.color + piece.type]}</span>}
              {legal && !piece && <span className="move-dot"/>}
              {legal && piece && <span className="capture-ring"/>}
              {file === (orientation === "white" ? "a" : "h") && <small className="rank-label">{rank}</small>}
              {rank === (orientation === "white" ? 1 : 8) && <small className="file-label">{file}</small>}
            </button>;
          }))}
        </div>
        <div className="player-bar own-bar"><span className="player-avatar own-avatar">{player?.name?.slice(0,1).toUpperCase() || "?"}</span><div><strong>{player?.name || "Du"}</strong><small>{player?.rating ? player.rating + " Elo" : "Du spielst " + orientation}</small></div><strong className={"clock " + (isYourTurn ? "active-clock" : "")}>{formatClock(playerTime ?? 0)}</strong></div>
      </section>
      <aside className="game-sidebar">
        <div className="game-status"><span className={"status-dot " + (gameState?.status === "started" ? "pulsing" : "")}/><strong>{gameState?.status === "started" ? (isYourTurn ? "Du bist am Zug" : "Gegner am Zug") : gameState ? "Partie beendet" : message}</strong></div>
        <div className="move-list"><div className="eyebrow">ZUGLISTE</div>{notation.length ? <div className="move-notation">{notation.map((move,index) => <span key={index}><b>{move.color === "white" ? move.number + "." : move.number + "…"}</b> {move.san}</span>)}</div> : <div className="move-empty">Die Züge erscheinen hier, sobald sie gespielt werden.</div>}</div>
        <section className="game-chat"><div className="eyebrow">PARTIE-CHAT</div><div className="chat-messages">{chat.length ? chat.map((item,index) => <p key={index}><strong>{item.username}</strong>{item.text}</p>) : <small>Chat-Nachrichten erscheinen hier.</small>}</div><form onSubmit={sendChat}><input aria-label="Chat-Nachricht" maxLength={200} value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Nachricht schreiben …" disabled={gameState?.status !== "started" || busy}/><button type="submit" disabled={!chatText.trim() || busy || gameState?.status !== "started"}>Senden</button></form></section>
        {error && <div className="game-error">{error}</div>}
        {gameState?.status === "started" && (orientation === "white" ? gameState.bdraw : gameState.wdraw) ? <div className="draw-offer"><strong>Gegner bietet Remis an.</strong><div><button onClick={() => void drawAction("accept")} disabled={busy}>Annehmen</button><button onClick={() => void drawAction("decline")} disabled={busy}>Ablehnen</button></div></div> : null}
        {gameState?.status === "started" && !(orientation === "white" ? gameState.wdraw : gameState.bdraw) && !(orientation === "white" ? gameState.bdraw : gameState.wdraw) ? <button className="draw-button" onClick={() => void drawAction("offer")} disabled={busy}>Remis anbieten</button> : null}
        {actionMessage && <div className="action-message">{actionMessage}</div>}
        <button className="resign-button" onClick={resign} disabled={busy || gameState?.status !== "started"}>Partie aufgeben</button>
        <a className="lichess-link" href={"https://lichess.org/" + gameId} target="_blank" rel="noreferrer">Auf Lichess ansehen ↗</a>
        <small className="fair-play">Keine Engine-Hilfe während einer laufenden Partie. Lichess-Fair-Play-Regeln gelten.</small>
      </aside>
    </main>
    {pendingPromotion && <div className="promotion-backdrop"><div className="promotion-dialog"><strong>Umwandlung wählen</strong><div>{["q","r","b","n"].map(type => <button key={type} onClick={() => { void sendMove(pendingPromotion.from,pendingPromotion.to,type); setPendingPromotion(null); }}>{glyphs[(orientation === "white" ? "w" : "b") + type]}</button>)}</div><button className="promotion-cancel" onClick={() => setPendingPromotion(null)}>Abbrechen</button></div></div>}
  </div>;
}
