const navigation = [
  ["♟", "Spielen", true],
  ["◷", "Täglich", false],
  ["▣", "Schach lernen", false],
  ["⌁", "Taktiktraining", false],
  ["⌕", "Analyse", false],
  ["⌘", "Eröffnungen", false],
  ["♜", "Turniere", false],
  ["▤", "Ranglisten", false],
  ["♧", "Freunde", false],
  ["◉", "Profil", false],
  ["⚙", "Einstellungen", false],
] as const;

export default function Home() {
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
            <h1>Guten Abend.</h1>
            <div className="subtitle">Bereit für deine nächste Partie?</div>
          </div>
          <div className="avatar" title="Noch nicht angemeldet">?</div>
        </header>

        <div className="grid-main">
          <section className="card hero">
            <div>
              <span className="pill">LICHESS INTEGRATION IN VORBEREITUNG</span>
              <h2>Dein nächster Zug beginnt hier.</h2>
              <p>Ein klarer, moderner Ort für deine Partien, Analysen und deinen Fortschritt. Verbinde dein Lichess-Konto, um loszulegen.</p>
            </div>
            <div className="actions">
              <button className="btn" disabled title="OAuth wird im nächsten Entwicklungsschritt eingerichtet">Mit Lichess verbinden</button>
              <button className="btn secondary" disabled>Als Gast ansehen</button>
            </div>
          </section>

          <section className="card">
            <div className="eyebrow">Dein Bereich</div>
            <h2 style={{marginTop:10}}>Alles an einem Ort</h2>
            <p>Dein Lichess-Profil, deine Wertungen und deine letzten Partien erscheinen hier nach der Anmeldung.</p>
            <div style={{marginTop:24}}>
              <div className="activity"><strong>Blitz</strong><span>—</span></div>
              <div className="activity"><strong>Bullet</strong><span>—</span></div>
              <div className="activity"><strong>Rapid</strong><span>—</span></div>
              <div className="activity"><strong>Klassisch</strong><span>—</span></div>
            </div>
          </section>
        </div>

        <div className="stat-grid">
          {["Partien","Siege","Remis","Niederlagen"].map((label) => (
            <div className="stat" key={label}><span>{label}</span><strong>—</strong></div>
          ))}
        </div>

        <div className="section-head"><h2>Deine letzten Aktivitäten</h2><span className="pill">WIRD VERKNÜPFT</span></div>
        <section className="card">
          <div className="activity"><strong>Spielhistorie</strong><span>Nach Lichess-Login verfügbar</span></div>
          <div className="activity"><strong>Deine Statistiken</strong><span>Nach Lichess-Login verfügbar</span></div>
          <div className="activity"><strong>Freunde & Herausforderungen</strong><span>Nach Lichess-Login verfügbar</span></div>
        </section>
      </main>
    </div>
  );
}
