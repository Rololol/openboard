"use client";

import { useCallback, useEffect, useState } from "react";

type Perf = { rating?: number; games?: number; rd?: number; prog?: number };
type Account = { id: string; username: string; title?: string; online?: boolean; perfs?: Record<string, Perf>; count?: { all?: number; win?: number; draw?: number; loss?: number }; profile?: { country?: string; bio?: string; location?: string } };
type AccountResponse = { authenticated: boolean; account?: Account };

const navigation = [["♟", "Spielen", true], ["◈", "Rätsel", false], ["▦", "Lernen", false], ["⌕", "Analyse", false], ["◉", "Profil", false]] as const;
const ratingKeys = [["Blitz", "blitz"], ["Bullet", "bullet"], ["Rapid", "rapid"], ["Klassisch", "classical"]] as const;
const pieces = ("♜♞♝♛♚♝♞♜" + "♟".repeat(8) + " ".repeat(32) + "♙".repeat(8) + "♖♘♗♕♔♗♘♖").split("");

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (response.status === 401) { setAccount(null); return; }
      if (!response.ok) throw new Error("Das Lichess-Profil konnte nicht geladen werden.");
      const data = (await response.json()) as AccountResponse;
      setAccount(data.account ?? null); setError("");
    } catch { setError("Verbindung zu Lichess fehlgeschlagen. Bitte erneut versuchen."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadAccount(); setAuthStatus(new URLSearchParams(window.location.search).get("auth")); }, [loadAccount]);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setAccount(null); }

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="/"><span className="brand-mark">O</span><span className="brand-name">openboard</span></a>
      <div className="nav-wrap"><div className="nav-label">SPIELZENTRALE</div>
        <nav className="nav">{navigation.map(([icon,label,active]) => <a href={active ? "/play" : "#"} className={active ? "active" : ""} key={label} aria-current={active ? "page" : undefined}><span className="nav-icon">{icon}</span><span className="nav-text">{label}</span></a>)}</nav>
        <div className="nav-label nav-label-secondary">MEHR</div>
        <nav className="nav nav-secondary"><a href="#"><span className="nav-icon">♜</span><span className="nav-text">Turniere</span></a><a href="#"><span className="nav-icon">♧</span><span className="nav-text">Freunde</span></a></nav>
      </div>
      <div className="sidebar-bottom">Unabhängiger Lichess-Client<br/>Spiele auf deiner Plattform</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">SPIELZENTRALE</div><h1>{account ? "Hallo, " + account.username : "Zeit für eine Partie?"}</h1><div className="subtitle">Dein Schach. Deine Züge. Dein Spiel.</div></div>
        {account ? <button className="avatar" title={account.username} onClick={logout}>{account.username.slice(0,1).toUpperCase()}</button> : <a className="avatar" href="/api/auth/lichess/start" aria-label="Mit Lichess verbinden">?</a>}
      </header>
      {authStatus === "success" && <div className="notice success">Lichess-Konto erfolgreich verbunden.</div>}
      {authStatus && authStatus !== "success" && <div className="notice error">Anmeldung fehlgeschlagen ({authStatus}). Bitte erneut versuchen.</div>}
      {error && <div className="notice error">{error}</div>}
      <section className="welcome-grid">
        <div className="play-panel"><div className="play-copy"><span className="pill"><span className="live-dot"/> LIVE AUF LICHESS</span><h2>Spiele Schach.<br/><em>Werde besser.</em></h2>
          <p>{account ? "Dein Lichess-Konto ist verbunden. Starte eine echte Spielsuche direkt über Lichess." : "Verbinde dein Lichess-Konto und mach dich bereit für deine nächste Partie."}</p>
          {account ? <a className="btn" href="/play">Partie suchen <span>→</span></a> : <a className="btn" href="/api/auth/lichess/start">Kostenlos verbinden <span>→</span></a>}
        </div><div className="board-preview" aria-label="Schachbrett-Vorschau">{pieces.map((piece,i) => <div className={(Math.floor(i/8)+i%8)%2===0 ? "square light" : "square dark"} key={i}>{piece}</div>)}</div></div>
        <div className="side-promos">
          <a className="promo puzzle-promo" href="#"><div className="promo-icon">♞</div><div><span className="promo-kicker">TAKTIKTRAINING</span><h3>Ein Zug voraus</h3><p>Trainiere dein Auge für Taktiken.</p></div><span className="promo-arrow">→</span></a>
          <a className="promo learn-promo" href="#"><div className="promo-icon">▤</div><div><span className="promo-kicker">SCHACH LERNEN</span><h3>Wissen vertiefen</h3><p>Eröffnungen, Strategie und mehr.</p></div><span className="promo-arrow">→</span></a>
        </div>
      </section>
      <div className="section-head"><div><div className="eyebrow">DEIN FORTSCHRITT</div><h2>Deine Wertungen</h2></div><span className="pill">{account ? "LICHESS VERBUNDEN" : "KONTO NICHT VERBUNDEN"}</span></div>
      <section className="rating-grid">{ratingKeys.map(([label,key]) => <div className="rating-card" key={key}><span>{label}</span><strong>{loading ? "…" : account?.perfs?.[key]?.rating ?? "—"}</strong><small>{account?.perfs?.[key]?.games != null ? account.perfs[key].games + " Partien" : "Lichess-Wertung"}</small></div>)}</section>
      <div className="section-head activity-heading"><div><div className="eyebrow">ÜBERSICHT</div><h2>Deine Schach-Aktivität</h2></div></div>
      <section className="activity-grid">{[["Partien",account?.count?.all,"♟"],["Siege",account?.count?.win,"↗"],["Remis",account?.count?.draw,"＝"],["Niederlagen",account?.count?.loss,"↘"]].map(([label,value,icon]) => <div className="activity-stat" key={label as string}><span className="activity-icon">{icon}</span><div><small>{label}</small><strong>{loading ? "…" : value ?? "—"}</strong></div></div>)}</section>
      <section className="account-strip"><div><div className="eyebrow">DEIN KONTO</div><h2>{account ? account.username : "Verbinde dein Lichess-Konto"}</h2><p>{account ? (account.online ? "Online" : "Lichess-Mitglied") + (account.profile?.country ? " · " + account.profile.country : "") : "Deine Wertungen und Partien werden direkt von Lichess geladen."}</p></div>
        {account ? <button className="btn subtle" onClick={logout}>Abmelden</button> : <a className="btn" href="/api/auth/lichess/start">Verbinden <span>→</span></a>}</section>
      <footer className="footer">Openboard ist ein unabhängiger Client. Spiel- und Kontodaten stammen von Lichess.</footer>
    </main>
  </div>;
}
