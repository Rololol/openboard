"use client";

import { useEffect, useState } from "react";
import { appPath, completeLichessLogin } from "@/lib/lichess-client";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Lichess-Anmeldung wird abgeschlossen …");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("openboard-theme");
    if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;
    let active = true;
    void completeLichessLogin().then(() => {
      if (!active) return;
      window.location.replace(appPath("/?auth=success"));
    }).catch((error: unknown) => {
      if (!active) return;
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen.");
    });
    return () => { active = false; };
  }, []);

  return <main className="auth-callback">
    <div className="auth-callback-card">
      <span className="brand-mark">O</span>
      <h1>{failed ? "Verbindung fehlgeschlagen" : "Openboard verbinden"}</h1>
      <p>{message}</p>
      {failed && <a className="btn" href={appPath("/")}>Zur Startseite</a>}
    </div>
  </main>;
}
