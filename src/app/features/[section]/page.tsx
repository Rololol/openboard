"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, CalendarDays, Clock3, History, Puzzle, Settings2, ShieldCheck, Swords, Trophy, Users, Zap, Tv, UserRound } from "lucide-react";
import { appPath, getAccessToken } from "@/lib/lichess-client";

const pages: Record<string,{title:string;kicker:string;description:string;icon:typeof Puzzle;detail:string;status:string}> = {
  tournaments:{title:"Turniere",kicker:"WETTKAMPF",description:"Finde Arena- und Schweizer Turniere und behalte deine nächsten Wettbewerbe im Blick.",icon:Trophy,detail:"Turnierübersicht und Teilnahme werden als native Openboard-Funktion umgesetzt.",status:"Turnierliste folgt"},
  friends:{title:"Freunde",kicker:"COMMUNITY",description:"Finde Schachfreunde, sieh wer online ist und starte Herausforderungen.",icon:Users,detail:"Freundesliste, Suche und Herausforderungen bekommen eine eigene Openboard-Oberfläche.",status:"Community-Bereich folgt"},
  puzzles:{title:"Tägliche Puzzles",kicker:"TAKTIKTRAINING",description:"Trainiere Mustererkennung und berechne die beste Fortsetzung.",icon:Puzzle,detail:"Das Puzzle des Tages wird über die Lichess-Daten-API geladen; die Oberfläche bleibt in Openboard.",status:"Puzzle wird geladen"},
  storm:{title:"Puzzle Storm",kicker:"ZEITDRUCK",description:"Löse so viele Taktikaufgaben wie möglich, bevor die Zeit abläuft.",icon:Zap,detail:"Ein eigener Storm-Modus mit Timer, Punktestand und Fehlerauswertung ist in Arbeit.",status:"Storm-Modus folgt"},
  learn:{title:"Lernen",kicker:"SCHACH VERBESSERN",description:"Eröffnungen, Endspiele und taktische Motive systematisch trainieren.",icon:BookOpen,detail:"Lernpfade und interaktive Übungen werden in Openboard integriert.",status:"Lernbereich folgt"},
  analysis:{title:"Analyse",kicker:"PARTIEN VERSTEHEN",description:"Untersuche Stellungen, Züge und Varianten auf einem eigenen Analysebrett.",icon:BarChart3,detail:"Die native Analyseansicht wird schrittweise um Zugnavigation und Engine-Auswertung erweitert.",status:"Analysebereich folgt"},
  tv:{title:"Schach-TV",kicker:"LIVE-PARTIEN",description:"Verfolge spannende Partien direkt in Openboard.",icon:Tv,detail:"Eine native Live-Übertragungsansicht ist geplant.",status:"TV-Bereich folgt"},
  profile:{title:"Spielerprofil",kicker:"DEIN SCHACH",description:"Wertungen, Spielstatistiken und deine letzten Partien an einem Ort.",icon:UserRound,detail:"Deine Kontodaten kommen von Lichess, werden aber innerhalb von Openboard angezeigt.",status:"Profil wird geladen"},
  history:{title:"Spielhistorie",kicker:"DEINE PARTIEN",description:"Greife auf deine gespielten Partien zu und öffne sie zur Analyse.",icon:History,detail:"Die Partienliste wird als native Openboard-Ansicht aufgebaut.",status:"Spielhistorie folgt"},
  settings:{title:"Einstellungen",kicker:"OPENBOARD ANPASSEN",description:"Passe Darstellung und Spieloberfläche an.",icon:Settings2,detail:"Darstellungsoptionen werden lokal in Openboard gespeichert. Kontoautorisierung bleibt bei Lichess.",status:"Einstellungen"},
  about:{title:"Über Openboard",kicker:"UNABHÄNGIGER CLIENT",description:"Openboard ist eine eigenständige Oberfläche für Schach mit Lichess als Spiel- und Kontoinfrastruktur.",icon:ShieldCheck,detail:"Openboard ist kein offizielles Produkt von Lichess oder Chess.com.",status:"Informationen"},
};
type PuzzleData={puzzle:{id:string;rating:number;plays:number;solution:string[]};game:{pgn:string;clock?:string}};
export function generateStaticParams(){return Object.keys(pages).map(section=>({section}));}

export default function FeaturePage({params}:{params:{section:string}}){
  const page=pages[params.section] ?? pages.about;
  const Icon=page.icon;
  const [puzzle,setPuzzle]=useState<PuzzleData|null>(null);
  const [puzzleError,setPuzzleError]=useState("");
  const [revealed,setRevealed]=useState(false);
  const [username,setUsername]=useState("");
  const [theme,setTheme]=useState("dark");
  useEffect(()=>{
    const saved=window.localStorage.getItem("openboard-theme")||"dark";
    setTheme(saved);document.documentElement.dataset.theme=saved;
    const user=new URLSearchParams(window.location.search).get("user");if(user)setUsername(user);
    if(params.section==="puzzles"){
      fetch("https://lichess.org/api/puzzle",{headers:{Accept:"application/json"}})
        .then(r=>{if(!r.ok)throw new Error("Puzzle konnte nicht geladen werden.");return r.json() as Promise<PuzzleData>})
        .then(setPuzzle).catch(e=>setPuzzleError(e instanceof Error?e.message:"Ladefehler"));
    }
    if(params.section==="profile"&&!getAccessToken()&&!user)setPuzzleError("Verbinde zuerst dein Lichess-Konto auf dem Dashboard.");
  },[params.section]);
  const toggleTheme=()=>{const next=theme==="dark"?"light":"dark";setTheme(next);document.documentElement.dataset.theme=next;window.localStorage.setItem("openboard-theme",next)};
  return <div className="feature-page">
    <header className="feature-header"><a href={appPath("/")} className="feature-brand"><span className="premium-brand-mark">O</span> openboard</a><div className="feature-header-actions"><button className="route-theme-toggle" onClick={toggleTheme}>{theme==="dark"?"☼":"☾"}</button><a href={appPath("/")}>Dashboard</a></div></header>
    <main className="feature-main">
      <a className="feature-back" href={appPath("/")}> <ArrowLeft size={15}/> Zur Übersicht</a>
      <div className="feature-kicker">{page.kicker}</div>
      <div className="feature-title-row"><span className="feature-title-icon"><Icon size={26}/></span><div><h1>{page.title}</h1><p>{page.description}</p></div></div>
      {params.section==="puzzles" ? <section className="feature-panel"><div className="feature-panel-head"><strong>Daily Puzzle</strong><span>{puzzle ? "Rating " + puzzle.puzzle.rating + " · " + puzzle.puzzle.plays.toLocaleString("de-DE") + " Versuche" : page.status}</span></div>{puzzleError?<p className="feature-muted">{puzzleError}</p>:puzzle?<><div className="puzzle-position"><div className="puzzle-board-placeholder">♜　♞　♝　♛　♚　♝　♞　♜<br/>♟　♟　♟　♟　♟　♟　♟　♟<br/><span>OPENBOARD · PUZZLE</span><br/>♙　♙　♙　♙　♙　♙　♙　♙<br/>♖　♘　♗　♕　♔　♗　♘　♖</div></div><p className="feature-muted">Die Puzzle-Stellung und Lösung sind geladen. Interaktives Brett und Zugprüfung sind der nächste Ausbauschritt.</p><button className="feature-action" onClick={()=>setRevealed(!revealed)}>{revealed?"Lösung verbergen":"Lösung anzeigen"} <ArrowRight size={15}/></button>{revealed&&<p className="feature-solution">{puzzle.puzzle.solution.join(" → ")}</p>}</>:<p className="feature-muted">Daily Puzzle wird geladen …</p>}</section> :
      params.section==="profile"&&username ? <section className="feature-panel"><strong>{username}</strong><p className="feature-muted">Öffentliches Spielerprofil. Die native Profilansicht mit Statistiken und Partien wird ergänzt.</p></section> :
      <section className="feature-panel"><div className="feature-panel-head"><strong>{page.status}</strong><span className="feature-tag">OPENBOARD</span></div><p className="feature-muted">{page.detail}</p><div className="feature-coming"><Clock3 size={18}/><span>Diese Seite wird direkt in Openboard umgesetzt. Es gibt hier bewusst keinen externen Lichess-Link.</span></div></section>}
      <section className="feature-shortcuts"><a href={appPath("/play/")}><Swords size={17}/> Partie starten <ArrowRight size={14}/></a><a href={appPath("/features/analysis/")}><BarChart3 size={17}/> Analyse <ArrowRight size={14}/></a><a href={appPath("/features/tournaments/")}><CalendarDays size={17}/> Turniere <ArrowRight size={14}/></a></section>
      <footer className="feature-footer">Openboard · Unabhängige Oberfläche · Lichess als Backend</footer>
    </main>
  </div>;
}
