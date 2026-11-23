"use client";

import { useEffect, useState } from "react";

type Perf = { rating?: number; games?: number; rd?: number; prog?: number };
type Account = {
  id: string;
  username: string;
  title?: string;
  online?: boolean;
  perfs?: Record<string, Perf>;
  count?: { all?: number; win?: number; draw?: number; loss?: number };
  profile?: { country?: string; bio?: string; location?: string };
};
type AccountResponse = { authenticated: boolean; account?: Account };

const navigation = [
  ["♟", "Spielen", true], ["◷", "Täglich", false], ["▣", "Schach lernen", false],
  ["⌁", "Taktiktraining", false], ["⌕", "Analyse", false], ["⌘", "Eröffnungen", false],
  ["♜", "Turniere", false], ["▤", "Ranglisten", false], ["♧", "Freunde", false],
  ["◉", "Profil", false], ["⚙", "Einstellungen", false],
] as const;

const ratingKeys = [
  ["Blitz", "blitz"], ["Bullet", "bullet"], ["Rapid", "rapid"], ["Klassisch", "classical"],
] as const;

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);

  async function loadAccount() {
    setLoading(true);
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (response.status === 401) {
        setAccount(null);
        return;
      }
      if (!response.ok) throw new Error("Das Lichess-Profil konnte nicht geladen werden.");
      const data = (await response.json()) as AccountResponse;
      setAccount(data.account ?? null);
      setError("");
    } catch {
      setError("Verbindung zu Lichess fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
    setAuthStatus(new URLSearchParams(window.location.search).get("auth"));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">O</span><span className="brand-name">openboard</span></a>
        <div style={{width:"100%"}}>
          <div className="nav-label">Menü</div>
          <nav className="nav">
            {navigation.map(([icon, label, active]) => (
              <a href="#" className={active ? "active" : ""} key={label} aria-current={active ? "page" : undefined}>
                <span className="nav-icon">{icon}</span><span className="nav-text">{label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">Unabhängiger Lichess-Client<br/>Powered by Lichess</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Dein Schach-Hub</div>
            <h1>{account ? `Willkommen, ${account.username}.` : "Guten Abend."}</h1>
            <div className="subtitle">Bereit für deine nächste Partie?</div>
          </div>
          {account ? <div className="avatar" title={account.username}>{account.username.slice(0,1).toUpperCase()}</div> : <div className="avatar">?</div>}
        </header>

        {authStatus === "success" && <div className="notice success">Lichess-Konto erfolgreich verbunden.</div>}
        {authStatus && authStatus !== "success" && <div className="notice error">Anmeldung fehlgeschlagen ({authStatus}). Bitte erneut versuchen.</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="grid-main">
          <section className="card hero">
            <div>
              <span className="pill">{account ? "LICHESS VERBUNDEN" : "ECHTE PARTIEN ÜBER LICHESS"}</span>
              <h2>{account ? "Bereit für deine nächste Partie?" : "Dein nächster Zug beginnt hier."}</h2>
              <p>{account ? "Dein Konto ist verbunden. Die Spielsuche und Live-Partien werden als Nächstes integriert." : "Verbinde dein Lichess-Konto, um deine Wertungen und deine Schachaktivität in Openboard zu sehen."}</p>
            </div>
            <div className="actions">
              {account ? <><a className="btn" href="https://lichess.org/">Auf Lichess spielen</a><button className="btn secondary" onClick={logout}>Abmelden</button></> :
                <a className="btn" href="/api/auth/lichess/start">Mit Lichess verbinden</a>}
            </div>
          </section>

          <section className="card">
            <div className="eyebrow">Dein Bereich</div>
            <h2 style={{marginTop:10}}>{account ? "Deine Wertungen" : "Dein Lichess-Profil"}</h2>
            <p>{account ? "Aktuelle Wertungen aus deinem Lichess-Konto." : "Nach der Anmeldung werden deine offiziellen Lichess-Daten angezeigt."}</p>
            <div style={{marginTop:24}}>
              {ratingKeys.map(([label, key]) => <div className="activity" key={key}><strong>{label}</strong><span>{loading ? "…" : account?.perfs?.[key]?.rating ?? "—"}</span></div>)}
            </div>
          </section>
        </div>

        <div className="stat-grid">
          {[
            ["Partien", account?.count?.all], ["Siege", account?.count?.win],
            ["Remis", account?.count?.draw], ["Niederlagen", account?.count?.loss],
          ].map(([label, value]) => <div className="stat" key={label as string}><span>{label}</span><strong>{loading ? "…" : value ?? "—"}</strong></div>)}
        </div>

        <div className="section-head"><h2>Dein Lichess-Konto</h2><span className="pill">{account ? "VERBUNDEN" : "NICHT VERBUNDEN"}</span></div>
        <section className="card">
          {account ? <>
            <div className="activity"><strong>Benutzername</strong><span>{account.username}{account.title ? ` · ${account.title}` : ""}</span></div>
            <div className="activity"><strong>Status</strong><span>{account.online ? "Online" : "Nicht online"}</span></div>
            <div className="activity"><strong>Land</strong><span>{account.profile?.country ?? "Nicht angegeben"}</span></div>
            <div className="activity"><strong>Blitz-Partien</strong><span>{account.perfs?.blitz?.games ?? "—"}</span></div>
          </> : <div className="activity"><strong>{loading ? "Verbindung wird geprüft …" : "Noch nicht angemeldet"}</strong><span>{loading ? "" : "Verbinde dein Lichess-Konto, um fortzufahren."}</span></div>}
        </section>
      </main>
    </div>
  );
}
