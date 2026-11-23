"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, BookOpen, CalendarDays, ChevronRight, Clock3, History, Home, Moon, Puzzle, Settings2, ShieldCheck, Sun, Swords, Trophy, Users, Zap } from "lucide-react";
import { appPath, beginLichessLogin, getAccessToken, lichessFetch, lichessJson, logoutLichess } from "@/lib/lichess-client";

type Perf = { rating?: number; games?: number; rd?: number; prog?: number };
type Account = {
  id: string; username: string; title?: string; online?: boolean;
  perfs?: Record<string, Perf>;
  count?: { all?: number; win?: number; draw?: number; loss?: number };
  profile?: { country?: string; bio?: string; location?: string };
};
type Game = {
  id: string; rated?: boolean; speed?: string; perf?: string; createdAt?: number; lastMoveAt?: number;
  status?: string; winner?: "white" | "black";
  players?: { white?: { user?: { name?: string }; rating?: number }; black?: { user?: { name?: string }; rating?: number } };
};

const ratings = [
  { label: "Bullet", key: "bullet", color: "violet" },
  { label: "Blitz", key: "blitz", color: "blue" },
  { label: "Rapid", key: "rapid", color: "green" },
  { label: "Classical", key: "classical", color: "amber" },
] as const;

const navGroups = [
  { label: "SPIELEN", items: [
    { label: "Übersicht", href: "/", icon: Home, internal: true },
    { label: "Partie starten", href: "/play/", icon: Swords, internal: true },
    { label: "Turniere", href: "https://lichess.org/tournament", icon: Trophy },
    { label: "Freunde", href: "https://lichess.org/player", icon: Users },
  ]},
  { label: "TRAINIEREN", items: [
    { label: "Tägliches Puzzle", href: "https://lichess.org/training/daily", icon: Puzzle },
    { label: "Puzzle Storm", href: "https://lichess.org/storm", icon: Zap },
    { label: "Lernen", href: "https://lichess.org/practice", icon: BookOpen },
    { label: "Analyse", href: "https://lichess.org/analysis", icon: BarChart3 },
  ]},
];

function gameResult(game: Game, accountName?: string) {
  if (!game.winner) return game.status === "started" ? "Läuft" : "Remis";
  const myColor = game.players?.white?.user?.name?.toLowerCase() === accountName?.toLowerCase() ? "white" : "black";
  return game.winner === myColor ? "Sieg" : "Niederlage";
}

function gameDate(timestamp?: number) {
  if (!timestamp) return "Kürzlich";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(timestamp));
}

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [error, setError] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      if (!getAccessToken()) { setAccount(null); setGames([]); return; }
      const data = await lichessJson<Account>("/api/account");
      setAccount(data); setError("");
      setGamesLoading(true);
      try {
        const response = await lichessFetch("/api/games/user/" + encodeURIComponent(data.username) + "?max=5&sort=dateDesc", {
          headers: { Accept: "application/x-ndjson" },
        });
        const body = await response.text();
        setGames(body.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Game));
      } catch { setGames([]); }
      finally { setGamesLoading(false); }
    } catch { setError("Verbindung zu Lichess fehlgeschlagen. Bitte erneut versuchen."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("openboard-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
    setAuthStatus(new URLSearchParams(window.location.search).get("auth"));
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("openboard-theme", theme);
  }, [theme]);

  async function logout() { await logoutLichess(); setAccount(null); setGames([]); }
  const profileUrl = account ? "https://lichess.org/@/" + encodeURIComponent(account.username) : "https://lichess.org";

  return <div className="premium-shell">
    <aside className="premium-sidebar">
      <a className="premium-brand" href={appPath("/")}><span className="premium-brand-mark">O</span><span>openboard</span></a>
      <div className="sidebar-caption">DEIN SCHACH-SPACE</div>
      {navGroups.map((group) => <div className="premium-nav-group" key={group.label}>
        <div className="premium-nav-label">{group.label}</div>
        {group.items.map((item) => {
          const Icon = item.icon;
          return <a key={item.label} href={item.internal ? appPath(item.href) : item.href} className={"premium-nav-item " + (item.label === "Übersicht" ? "selected" : "")} target={item.internal ? undefined : "_blank"} rel={item.internal ? undefined : "noreferrer"}>
            <Icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{!item.internal && <ArrowUpRight className="nav-external" size={13}/>}
          </a>;
        })}
      </div>)}
      <div className="premium-sidebar-bottom">
        <a href="https://lichess.org/account/preferences" target="_blank" rel="noreferrer"><Settings2 size={17}/> Einstellungen <ArrowUpRight size={12}/></a>
        <div className="sidebar-source"><ShieldCheck size={15}/> Spielbetrieb durch Lichess</div>
      </div>
    </aside>

    <main className="premium-main">
      <header className="premium-topbar">
        <div><div className="premium-eyebrow">DEIN DASHBOARD</div><h1>{account ? "Willkommen zurück, " + account.username : "Dein nächster Zug beginnt hier."}</h1><p>Spiele, trainiere und behalte deinen Fortschritt im Blick.</p></div>
        <div className="topbar-actions">
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Helles Theme aktivieren" : "Dunkles Theme aktivieren"}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
          {account ? <button className="account-chip" onClick={() => void logout()} title="Von Lichess abmelden"><span className="account-avatar">{account.username.slice(0,1).toUpperCase()}</span><span>{account.username}</span><span className="online-indicator"/></button> : <button className="connect-button" onClick={() => void beginLichessLogin()}>Mit Lichess verbinden <ArrowUpRight size={16}/></button>}
        </div>
      </header>

      {authStatus === "success" && <div className="premium-notice success">Lichess-Konto erfolgreich verbunden.</div>}
      {authStatus && authStatus !== "success" && <div className="premium-notice error">Anmeldung fehlgeschlagen ({authStatus}). Bitte erneut versuchen.</div>}
      {error && <div className="premium-notice error">{error}</div>}

      <section className="premium-hero">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-live-dot"/> DIREKT MIT LICHESS VERBUNDEN</div>
          <h2>Ein guter Zug<br/><span>verändert alles.</span></h2>
          <p>{account ? "Dein Lichess-Konto ist bereit. Starte eine echte Partie gegen Spieler auf der ganzen Welt." : "Verbinde dein Lichess-Konto und spiele direkt auf der offiziellen Lichess-Infrastruktur."}</p>
          <div className="hero-actions">
            {account ? <a className="primary-cta" href={appPath("/play/")}>Jetzt spielen <ChevronRight size={18}/></a> : <button className="primary-cta" onClick={() => void beginLichessLogin()}>Kostenlos verbinden <ChevronRight size={18}/></button>}
            <a className="secondary-cta" href="https://lichess.org/tv" target="_blank" rel="noreferrer">Partien ansehen <ArrowUpRight size={15}/></a>
          </div>
          <div className="hero-trust"><ShieldCheck size={15}/> Dein Konto, deine Wertung und alle Partien bleiben bei Lichess.</div>
        </div>
        <div className="hero-board-wrap" aria-label="Schachbrett-Dekoration">
          <div className="hero-board">{("♜♞♝♛♚♝♞♜"+"♟".repeat(8)+" ".repeat(32)+"♙".repeat(8)+"♖♘♗♕♔♗♘♖").split("").map((piece,i) => <div className={"hero-square " + ((Math.floor(i/8)+i%8)%2===0 ? "sq-light" : "sq-dark")} key={i}>{piece}</div>)}</div>
          <div className="board-glow"/>
          <div className="board-tag"><span/> LIVE CHESS</div>
        </div>
      </section>

      <section className="quick-play-section">
        <div className="section-heading"><div><div className="premium-eyebrow">SCHNELLSTART</div><h2>Wie möchtest du spielen?</h2></div><a href={appPath("/play/")}>Alle Spieloptionen <ChevronRight size={15}/></a></div>
        <div className="quick-play-grid">
          <a className="quick-play-card rapid" href={appPath("/play/")}><span className="quick-icon"><Clock3 size={20}/></span><span className="quick-label">RAPID</span><strong>10 + 0</strong><small>Entspannt und fokussiert</small><span className="quick-arrow"><ChevronRight size={17}/></span></a>
          <a className="quick-play-card rapid" href={appPath("/play/")}><span className="quick-icon"><Clock3 size={20}/></span><span className="quick-label">RAPID</span><strong>15 + 10</strong><small>Mehr Zeit für Ideen</small><span className="quick-arrow"><ChevronRight size={17}/></span></a>
          <a className="quick-play-card classical" href={appPath("/play/")}><span className="quick-icon"><CalendarDays size={20}/></span><span className="quick-label">CLASSICAL</span><strong>30 + 0</strong><small>Strategie mit Ruhe</small><span className="quick-arrow"><ChevronRight size={17}/></span></a>
        </div>
        <p className="mode-note">Die angebotenen Zufallssuchen entsprechen den Zeitkontrollen, die Lichess über die offizielle Board API unterstützt.</p>
      </section>

      <section className="dashboard-columns">
        <div className="dashboard-main-column">
          <div className="section-heading compact"><div><div className="premium-eyebrow">DEINE WERTUNGEN</div><h2>Rating-Übersicht</h2></div><span className="data-source">LIVE VON LICHESS</span></div>
          <div className="premium-rating-grid">{ratings.map((rating) => <div className={"premium-rating-card " + rating.color} key={rating.key}><div className="rating-card-top"><span>{rating.label}</span><span className="rating-spark">↗</span></div><strong>{loading ? "…" : account?.perfs?.[rating.key]?.rating ?? "—"}</strong><small>{account?.perfs?.[rating.key]?.games != null ? account.perfs[rating.key].games + " Partien" : "Noch keine Daten"}</small></div>)}</div>

          <div className="section-heading compact recent-heading"><div><div className="premium-eyebrow">DEINE LETZTEN PARTIEN</div><h2>Spielhistorie</h2></div>{account && <a href={profileUrl + "/all"} target="_blank" rel="noreferrer">Alle ansehen <ArrowUpRight size={14}/></a>}</div>
          <div className="recent-games-card">
            {!account ? <div className="empty-state"><History size={22}/><strong>Deine Partien auf einen Blick</strong><span>Verbinde dein Lichess-Konto, um deine letzten Spiele zu sehen.</span></div> :
              gamesLoading ? <div className="empty-state">Spielhistorie wird geladen …</div> :
              games.length ? games.map((game) => {
                const white = game.players?.white?.user?.name || "Anonym";
                const black = game.players?.black?.user?.name || "Anonym";
                const result = gameResult(game, account.username);
                return <a className="recent-game-row" key={game.id} href={"https://lichess.org/" + game.id} target="_blank" rel="noreferrer">
                  <span className={"result-mark " + (result === "Sieg" ? "won" : result === "Niederlage" ? "lost" : "drawn")}>{result === "Sieg" ? "W" : result === "Niederlage" ? "L" : "½"}</span>
                  <span className="game-players"><strong>{white}</strong><small>vs</small><strong>{black}</strong></span>
                  <span className="game-meta">{game.perf || game.speed || "Schach"} · {gameDate(game.createdAt)}</span>
                  <ArrowUpRight size={15}/>
                </a>;
              }) : <div className="empty-state"><History size={22}/><strong>Noch keine Partien gefunden</strong><span>Deine nächsten Spiele erscheinen hier.</span></div>}
          </div>
        </div>

        <aside className="dashboard-side-column">
          <div className="section-heading compact"><div><div className="premium-eyebrow">TÄGLICH TRAINIEREN</div><h2>Daily Puzzle</h2></div><Puzzle size={19}/></div>
          <div className="daily-puzzle-card">
            <div className="puzzle-embed"><iframe title="Lichess Puzzle des Tages" src={"https://lichess.org/training/frame?bg=" + theme + "&theme=brown"} loading="lazy" allow="fullscreen"/></div>
            <div className="puzzle-footer"><span>Offizielles Lichess-Puzzle</span><a href="https://lichess.org/training/daily" target="_blank" rel="noreferrer">Training öffnen <ArrowUpRight size={13}/></a></div>
          </div>
          <div className="progress-card">
            <div className="progress-icon"><Activity size={19}/></div><div><strong>Dein Fortschritt</strong><p>{account ? (account.count?.all ?? 0) + " Partien insgesamt auf Lichess" : "Verbinde dein Konto für persönliche Statistiken."}</p></div>
            {account && <a href={profileUrl} target="_blank" rel="noreferrer" aria-label="Lichess-Profil öffnen"><ArrowUpRight size={16}/></a>}
          </div>
          <div className="feature-links">
            <a href="https://lichess.org/storm" target="_blank" rel="noreferrer"><span className="feature-icon storm"><Zap size={17}/></span><span><strong>Puzzle Storm</strong><small>Teste deine Geschwindigkeit</small></span><ArrowUpRight size={14}/></a>
            <a href="https://lichess.org/practice" target="_blank" rel="noreferrer"><span className="feature-icon learn"><BookOpen size={17}/></span><span><strong>Eröffnungen & Praxis</strong><small>Trainiere gezielt</small></span><ArrowUpRight size={14}/></a>
            <a href="https://lichess.org/tournament" target="_blank" rel="noreferrer"><span className="feature-icon tourney"><Trophy size={17}/></span><span><strong>Turniere</strong><small>Spiele um den Sieg</small></span><ArrowUpRight size={14}/></a>
          </div>
        </aside>
      </section>

      <section className="premium-account-footer">
        <div><div className="premium-eyebrow">DEIN LICHESS-KONTO</div><h2>{account ? account.username : "Alles beginnt mit deinem Lichess-Konto."}</h2><p>{account ? "Verbunden mit der offiziellen Lichess-Infrastruktur." : "Ein Login. Deine bestehenden Wertungen. Deine gesamte Spielhistorie."}</p></div>
        {account ? <div className="footer-account-actions"><a className="secondary-cta" href={profileUrl} target="_blank" rel="noreferrer">Profil öffnen <ArrowUpRight size={14}/></a><button className="disconnect-button" onClick={() => void logout()}>Abmelden</button></div> : <button className="primary-cta" onClick={() => void beginLichessLogin()}>Mit Lichess verbinden <ArrowUpRight size={15}/></button>}
      </section>
      <footer className="premium-footer"><span>OPENBOARD</span><span>Unabhängiger Client · Spielbetrieb und Kontodaten durch Lichess</span><a href="https://lichess.org/api" target="_blank" rel="noreferrer">Lichess API <ArrowUpRight size={12}/></a></footer>
    </main>
  </div>;
}
