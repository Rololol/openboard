"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Activity, ArrowLeft, ArrowRight, BarChart3, BookOpen, CalendarDays, Clock3, History, Home, Moon, Puzzle, Search, Settings2, ShieldCheck, Swords, Trophy, Users, Zap, Tv, UserRound, Sun } from "lucide-react";
import { appPath, getAccessToken, lichessFetch } from "@/lib/lichess-client";

type PageDef = { title:string; kicker:string; description:string; icon:typeof Puzzle };
const pages: Record<string,PageDef> = {
  tournaments:{title:"Turniere",kicker:"WETTKAMPF",description:"Entdecke laufende Arena-Turniere und verfolge das Geschehen direkt in Openboard.",icon:Trophy},
  friends:{title:"Freunde",kicker:"COMMUNITY",description:"Suche Spieler, prüfe ihren Online-Status und fordere sie zu einer Partie heraus.",icon:Users},
  puzzles:{title:"Tägliche Puzzles",kicker:"TAKTIKTRAINING",description:"Löse das offizielle Tagesrätsel auf einem interaktiven Openboard-Schachbrett.",icon:Puzzle},
  storm:{title:"Puzzle Storm",kicker:"ZEITDRUCK",description:"Trainiere deine Taktik unter Zeitdruck und verfolge deine persönliche Bestleistung.",icon:Zap},
  learn:{title:"Lernen",kicker:"SCHACH VERBESSERN",description:"Arbeite an deinen Grundlagen, Eröffnungen und taktischen Motiven.",icon:BookOpen},
  analysis:{title:"Analyse",kicker:"PARTIEN VERSTEHEN",description:"Öffne deine Partien, navigiere durch die Züge und untersuche Stellungen.",icon:BarChart3},
  tv:{title:"Schach-TV",kicker:"LIVE-PARTIEN",description:"Entdecke laufende Top-Partien und öffne sie in einer eigenen Openboard-Ansicht.",icon:Tv},
  profile:{title:"Spielerprofil",kicker:"DEIN SCHACH",description:"Wertungen, Statistiken und Kontodaten aus deinem Lichess-Konto – in Openboard dargestellt.",icon:UserRound},
  history:{title:"Spielhistorie",kicker:"DEINE PARTIEN",description:"Deine letzten Partien mit Ergebnis und direktem Einstieg in die Analyse.",icon:History},
  settings:{title:"Einstellungen",kicker:"OPENBOARD ANPASSEN",description:"Passe Darstellung und Bedienung deiner Schachoberfläche an.",icon:Settings2},
  about:{title:"Über Openboard",kicker:"UNABHÄNGIGER CLIENT",description:"Eine eigenständige Schachoberfläche mit Lichess als Spiel- und Kontoinfrastruktur.",icon:ShieldCheck},
};
type PuzzleData={puzzle:{id:string;rating:number;plays:number;solution:string[];initialPly:number};game:{pgn:string;clock?:string}};
type Tournament={id:string;fullName?:string;minutes?:number;seconds?:number;nbPlayers?:number;isStarted?:boolean;startsAt?:number;finishesAt?:number;variant?:{name?:string}};
type Player={id:string;username?:string;online?:boolean;perfs?:Record<string,{rating?:number}>;title?:string};
type GameRow={id:string;createdAt?:number;lastMoveAt?:number;status?:string;winner?:string;speed?:string;players?:{white?:{user?:{name?:string};rating?:number};black?:{user?:{name?:string};rating?:number}}};
const LICHESS="https://lichess.org";
const pieceGlyph:Record<string,string>={wk:"♔",wq:"♕",wr:"♖",wb:"♗",wn:"♘",wp:"♙",bk:"♚",bq:"♛",br:"♜",bb:"♝",bn:"♞",bp:"♟"};

async function readNdjson<T>(url:string,token?:string):Promise<T[]>{
  const response=await fetch(url,{headers:{Accept:"application/x-ndjson",...(token?{Authorization:"Bearer "+token}:{})},cache:"no-store"});
  if(!response.ok)throw new Error("Daten konnten nicht geladen werden ("+response.status+").");
  const body=await response.text();
  return body.split("\n").filter(Boolean).map(line=>JSON.parse(line) as T);
}

export default function FeatureClient({section}:{section:string}){
  const page=pages[section]??pages.about; const Icon=page.icon;
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [tournaments,setTournaments]=useState<Tournament[]>([]);
  const [players,setPlayers]=useState<Player[]>([]);
  const [username,setUsername]=useState(""); const [searchName,setSearchName]=useState("");
  const [profile,setProfile]=useState<Player|null>(null);
  const [games,setGames]=useState<GameRow[]>([]);
  const [puzzle,setPuzzle]=useState<PuzzleData|null>(null);
  const [revealed,setRevealed]=useState(false);
  const [puzzleFen,setPuzzleFen]=useState("");
  const [puzzleMove,setPuzzleMove]=useState<Square|null>(null);
  const [puzzleStep,setPuzzleStep]=useState(0);
  const [puzzleMessage,setPuzzleMessage]=useState("");
  const [pgn,setPgn]=useState("");
  const [analysisGame,setAnalysisGame]=useState("");
  const [analysisIndex,setAnalysisIndex]=useState(0);
  const [tvChannels,setTvChannels]=useState<string[]>([]);
  const [tvChannel,setTvChannel]=useState("best"); const [tvGameId,setTvGameId]=useState(""); const [puzzleStartFen,setPuzzleStartFen]=useState("");
  const [storm,setStorm]=useState<Record<string,unknown>|null>(null);
  const [following,setFollowing]=useState(false);

  useEffect(()=>{
    const saved=window.localStorage.getItem("openboard-theme");
    if(saved==="light"||saved==="dark"){setTheme(saved);document.documentElement.dataset.theme=saved;}
    const params=new URLSearchParams(window.location.search);
    const user=params.get("user"); if(user){setUsername(user);setSearchName(user);}
    const gameId=params.get("gameId"); if(gameId)setAnalysisGame(gameId);
  },[]);
  const toggleTheme=()=>{const next=theme==="dark"?"light":"dark";setTheme(next);document.documentElement.dataset.theme=next;window.localStorage.setItem("openboard-theme",next);};

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try{
        if(section==="tournaments"){
          const response=await fetch(LICHESS+"/api/tournament",{headers:{Accept:"application/json"},cache:"no-store"});
          if(!response.ok)throw new Error("Turniere konnten nicht geladen werden.");
          const data=await response.json() as {started?:Tournament[];created?:Tournament[]};
          if(active)setTournaments([...(data.started??[]),...(data.created??[])]);
        }else if(section==="puzzles"){
          const response=await fetch(LICHESS+"/api/puzzle/daily",{headers:{Accept:"application/json"},cache:"no-store"});
          if(!response.ok)throw new Error("Daily Puzzle konnte nicht geladen werden.");
          const data=await response.json() as PuzzleData;
          if(active){
            setPuzzle(data);
            const chess=new Chess(); chess.loadPgn(data.game.pgn);
            const moves=chess.history({verbose:true});
            const start=new Chess();
            for(const move of moves.slice(0,data.puzzle.initialPly))start.move(move);
            setPuzzleFen(start.fen());setPuzzleStartFen(start.fen());setPuzzleStep(0);setPuzzleMessage("Weiß ist am Zug. Finde die beste Fortsetzung.");
          }
        }else if(section==="friends"){
          const token=getAccessToken();
          if(!token)throw new Error("Melde dich über das Dashboard an, um deine Freundesliste zu laden.");
          const response=await fetch(LICHESS+"/api/rel/following",{headers:{Authorization:"Bearer "+token,Accept:"application/x-ndjson"},cache:"no-store"});
          if(!response.ok)throw new Error(response.status===403?"Für die Freundesliste ist eine erneute Kontofreigabe erforderlich.":"Freundesliste konnte nicht geladen werden.");
          const body=await response.text();const list=body.split("\n").filter(Boolean).map(line=>JSON.parse(line) as Player);
          if(active)setPlayers(list);
        }else if(section==="profile"){
          const token=getAccessToken();const name=userFromUrl()||"";
          if(!name&&!token)throw new Error("Verbinde dein Lichess-Konto oder öffne ein Profil über die Spielersuche.");
          const response=name?await fetch(LICHESS+"/api/user/"+encodeURIComponent(name),{headers:{Accept:"application/json"}}):await fetch(LICHESS+"/api/account",{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
          if(!response.ok)throw new Error("Spielerprofil konnte nicht geladen werden.");
          if(active)setProfile(await response.json() as Player);
        }else if(section==="history"){
          const token=getAccessToken();if(!token)throw new Error("Verbinde dein Lichess-Konto, um deine Spielhistorie zu sehen.");
          const accountResponse=await fetch(LICHESS+"/api/account",{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
          if(!accountResponse.ok)throw new Error("Konto konnte nicht geladen werden.");
          const account=await accountResponse.json() as {username:string};
          const list=await readNdjson<GameRow>(LICHESS+"/api/games/user/"+encodeURIComponent(account.username)+"?max=30&sort=dateDesc",token);
          if(active){setUsername(account.username);setGames(list);}
        }else if(section==="tv"){
          const response=await fetch(LICHESS+"/api/tv/channels",{headers:{Accept:"application/json"}});
          if(!response.ok)throw new Error("TV-Kanäle konnten nicht geladen werden.");
          const data=await response.json() as {channels?:Record<string,unknown>};
          if(active)setTvChannels(Object.keys(data.channels??{}));
        }else if(section==="storm"){
          const token=getAccessToken();if(!token)throw new Error("Verbinde dein Lichess-Konto, um deine Storm-Statistik zu sehen.");
          const accountResponse=await fetch(LICHESS+"/api/account",{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
          if(!accountResponse.ok)throw new Error("Konto konnte nicht geladen werden.");
          const account=await accountResponse.json() as {username:string};
          const response=await fetch(LICHESS+"/api/storm/dashboard/"+encodeURIComponent(account.username),{headers:{Accept:"application/json"}});
          if(!response.ok)throw new Error("Storm-Statistik konnte nicht geladen werden.");
          if(active)setStorm(await response.json() as Record<string,unknown>);
        }else if(section==="analysis"&&gameIdFromUrl()){
          const id=gameIdFromUrl()!;
          const response=await fetch(LICHESS+"/game/export/"+encodeURIComponent(id),{headers:{Accept:"application/x-chess-pgn"}});
          if(!response.ok)throw new Error("Partie konnte nicht geladen werden.");
          if(active){setPgn(await response.text());setAnalysisGame(id);}
        }
      }catch(cause){if(active)setError(cause instanceof Error?cause.message:"Daten konnten nicht geladen werden.");}
      finally{if(active)setLoading(false);}
    }
    function userFromUrl(){return new URLSearchParams(window.location.search).get("user");}
    function gameIdFromUrl(){return new URLSearchParams(window.location.search).get("gameId");}
    void load();return()=>{active=false;};
  },[section]);

  useEffect(()=>{
    if(section!=="tv"||!tvChannel)return;
    let active=true;
    fetch(LICHESS+"/api/tv/"+encodeURIComponent(tvChannel),{headers:{Accept:"application/json"},cache:"no-store"})
      .then(response=>{if(!response.ok)throw new Error("TV-Kanal nicht verfügbar.");return response.json() as Promise<{champion?:{gameId?:string};game?:{id?:string}}>;})
      .then(data=>{if(active)setTvGameId(data.champion?.gameId||data.game?.id||"");})
      .catch(()=>{if(active)setTvGameId("");});
    return()=>{active=false;};
  },[section,tvChannel]);

  const parsedAnalysis=useMemo(()=>{
    if(!pgn)return {moves:[] as string[],fen:""};
    try{const chess=new Chess();chess.loadPgn(pgn);return {moves:chess.history(),fen:chess.fen()};}catch{return {moves:[] as string[],fen:""};}
  },[pgn]);
  const analysisFen=useMemo(()=>{
    if(!pgn)return new Chess().fen();
    try{const chess=new Chess();chess.loadPgn(pgn);const all=chess.history({verbose:true});const replay=new Chess();for(const move of all.slice(0,analysisIndex))replay.move(move);return replay.fen();}catch{return new Chess().fen();}
  },[pgn,analysisIndex]);
  const analysisBoard=useMemo(()=>new Chess(analysisFen),[analysisFen]);
  const puzzleBoard=useMemo(()=>puzzleFen?new Chess(puzzleFen):new Chess(),[puzzleFen]);

  async function searchPlayer(event:React.FormEvent){event.preventDefault();const name=searchName.trim();if(!name)return;setLoading(true);setError("");try{const response=await fetch(LICHESS+"/api/user/"+encodeURIComponent(name),{headers:{Accept:"application/json"}});if(!response.ok)throw new Error("Spieler nicht gefunden.");const player=await response.json() as Player;setPlayers([player]);}catch(e){setError(e instanceof Error?e.message:"Suche fehlgeschlagen.");}finally{setLoading(false);}}
  async function challenge(name:string){const token=getAccessToken();if(!token){setError("Zum Herausfordern musst du dein Konto verbinden.");return;}setLoading(true);setError("");try{const response=await fetch(LICHESS+"/api/challenge/"+encodeURIComponent(name),{method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/json"}});if(!response.ok)throw new Error("Herausforderung fehlgeschlagen ("+response.status+").");setError("Herausforderung an "+name+" wurde erstellt.");}catch(e){setError(e instanceof Error?e.message:"Herausforderung fehlgeschlagen.");}finally{setLoading(false);}}
  async function joinTournament(id:string){const token=getAccessToken();if(!token){setError("Zum Beitreten musst du dein Konto verbinden.");return;}setLoading(true);try{const response=await fetch(LICHESS+"/api/tournament/"+encodeURIComponent(id)+"/join",{method:"POST",headers:{Authorization:"Bearer "+token}});if(!response.ok)throw new Error("Beitritt fehlgeschlagen ("+response.status+").");setError("Turnier beigetreten.");}catch(e){setError(e instanceof Error?e.message:"Beitritt fehlgeschlagen.");}finally{setLoading(false);}}
  function puzzleClick(square:Square){
    if(!puzzle||!puzzleFen)return;
    if(!puzzleMove){if(puzzleBoard.get(square))setPuzzleMove(square);return;}
    const move=puzzleMove+square;
    const expected=puzzle.puzzle.solution[puzzleStep];
    if(move===expected){
      const next=new Chess(puzzleFen);try{next.move({from:puzzleMove,to:square,promotion:"q"});setPuzzleFen(next.fen());setPuzzleStep(s=>s+1);setPuzzleMove(null);setPuzzleMessage(puzzleStep+1>=puzzle.puzzle.solution.length?"Puzzle gelöst. Gute Arbeit.":"Richtig – weiter geht's.");}catch{setPuzzleMove(null);}
    }else{setPuzzleMove(null);setPuzzleMessage("Nicht ganz. Prüfe die Stellung und versuche es erneut.");}
  }
  function gameOutcome(game:GameRow){if(game.status==="started")return"Läuft";if(!game.winner)return"Remis";const white=game.players?.white?.user?.name?.toLowerCase()===username.toLowerCase();return (game.winner===(white?"white":"black"))?"Sieg":"Niederlage";}

  const nav=[["Übersicht","/",Home],["Spielen","/play/",Swords],["Turniere","/features/tournaments/",Trophy],["Freunde","/features/friends/",Users],["Puzzles","/features/puzzles/",Puzzle],["Storm","/features/storm/",Zap],["Lernen","/features/learn/",BookOpen],["Analyse","/features/analysis/",BarChart3],["TV","/features/tv/",Tv],["Profil","/features/profile/",UserRound],["Historie","/features/history/",History],["Einstellungen","/features/settings/",Settings2]] as const;

  return <div className="feature-app">
    <aside className="feature-sidebar"><a className="feature-brand" href={appPath("/")}><span className="premium-brand-mark">O</span><span>openboard</span></a><div className="feature-nav-label">SPIELZENTRUM</div>{nav.map(([label,href,NavIcon])=><a key={href} href={appPath(href)} className={"feature-nav-item "+((href==="/features/"+section+"/")?"active":"")}><NavIcon size={17}/><span>{label}</span></a>)}<div className="feature-sidebar-bottom"><ShieldCheck size={15}/> Lichess-Infrastruktur</div></aside>
    <div className="feature-workspace">
      <header className="feature-header"><div><span className="feature-header-kicker">OPENBOARD / {page.kicker}</span><h1>{page.title}</h1></div><div className="feature-header-actions"><button className="route-theme-toggle" onClick={toggleTheme} aria-label="Farbschema wechseln">{theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}</button><a href={appPath("/")}>Dashboard</a></div></header>
      <main className="feature-main">
        <div className="feature-intro"><span className="feature-title-icon"><Icon size={24}/></span><p>{page.description}</p></div>
        {error&&<div className="feature-alert">{error}</div>}
        {loading&&<div className="feature-loading">Openboard lädt die aktuellen Daten …</div>}
        {section==="tournaments"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Laufende Turniere</strong><span>{tournaments.length} gefunden</span></div>{tournaments.length?tournaments.map(t=><article className="feature-data-row" key={t.id}><div className="feature-row-icon"><Trophy size={18}/></div><div className="feature-row-main"><strong>{t.fullName||"Arena-Turnier"}</strong><small>{t.nbPlayers??0} Spieler · {t.minutes??"—"} Minuten · {t.variant?.name||"Standard"}</small></div><button className="feature-action" onClick={()=>void joinTournament(t.id)} disabled={loading}>Beitreten</button></article>):!loading&&!error?<p className="feature-muted">Aktuell wurden keine laufenden Turniere gemeldet.</p>:null}</section>}
        {section==="friends"&&<><form className="feature-search" onSubmit={searchPlayer}><Search size={17}/><input value={searchName} onChange={e=>setSearchName(e.target.value)} placeholder="Lichess-Benutzername suchen"/><button className="feature-action" type="submit">Suchen</button></form><section className="feature-panel"><div className="feature-panel-head"><strong>Spieler & Freunde</strong><span>{players.length} Einträge</span></div>{players.map(p=><article className="feature-data-row" key={p.id}><div className="feature-row-avatar">{(p.username||p.id).slice(0,1).toUpperCase()}</div><div className="feature-row-main"><strong>{p.title?p.title+" ":""}{p.username||p.id}</strong><small>{p.online?"Online":"Status unbekannt"} · Blitz {p.perfs?.blitz?.rating??"—"}</small></div><button className="feature-action" onClick={()=>void challenge(p.username||p.id)} disabled={loading}>Herausfordern</button></article>)}</section></>}
        {section==="puzzles"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Daily Puzzle</strong><span>{puzzle?"Rating "+puzzle.puzzle.rating+" · "+puzzle.puzzle.plays.toLocaleString("de-DE")+" Versuche":"Tagesrätsel"}</span></div>{puzzle&&<><div className="feature-chessboard">{[8,7,6,5,4,3,2,1].flatMap(rank=>"abcdefgh".split("").map((file)=>{const sq=(file+rank) as Square;const piece=puzzleBoard.get(sq);return <button key={sq} className={((file.charCodeAt(0)-97+rank)%2?"dark":"light")+(puzzleMove===sq?" selected":"")} onClick={()=>puzzleClick(sq)}>{piece?pieceGlyph[piece.color+piece.type]:null}</button>}))}</div><p className="feature-muted">{puzzleMessage}</p><div className="feature-panel-actions"><button className="feature-action" onClick={()=>{setPuzzleFen(puzzleStartFen);setPuzzleStep(0);setPuzzleMove(null);setPuzzleMessage("Puzzle zurückgesetzt.");}}>Zurücksetzen</button><button className="feature-action secondary" onClick={()=>setRevealed(v=>!v)}>{revealed?"Lösung verbergen":"Lösung anzeigen"}</button></div>{revealed&&<p className="feature-solution">{puzzle.puzzle.solution.join(" → ")}</p>}</>}</section>}
        {section==="history"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Letzte Partien {username&&"· "+username}</strong><span>{games.length} Partien</span></div>{games.map(g=><a className="feature-data-row feature-game-row" key={g.id} href={appPath("/features/analysis/")+"?gameId="+encodeURIComponent(g.id)}><div className="feature-row-icon"><History size={18}/></div><div className="feature-row-main"><strong>{g.players?.white?.user?.name||"Weiß"} vs {g.players?.black?.user?.name||"Schwarz"}</strong><small>{g.speed||"Schach"} · {gameOutcome(g)} · {g.createdAt?new Date(g.createdAt).toLocaleDateString("de-DE"):"Datum unbekannt"}</small></div><ArrowRight size={16}/></a>)}</section>}
        {section==="profile"&&<section className="feature-panel">{profile?<><div className="feature-profile-head"><div className="feature-profile-avatar">{(profile.username||profile.id).slice(0,1).toUpperCase()}</div><div><strong>{profile.title?profile.title+" ":""}{profile.username||profile.id}</strong><p className="feature-muted">{profile.online?"Gerade online":"Spielerprofil"}</p></div></div><div className="feature-metrics">{["bullet","blitz","rapid","classical"].map(key=><div key={key}><small>{key}</small><strong>{profile.perfs?.[key]?.rating??"—"}</strong></div>)}</div></>:<p className="feature-muted">Profil wird geladen …</p>}</section>}
        {section==="analysis"&&<section className="feature-panel"><form className="feature-search" onSubmit={e=>{e.preventDefault();window.location.href=appPath("/features/analysis/")+"?gameId="+encodeURIComponent(analysisGame);}}><Search size={17}/><input value={analysisGame} onChange={e=>setAnalysisGame(e.target.value)} placeholder="Partie-ID eingeben"/><button className="feature-action" type="submit">Öffnen</button></form>{pgn?<><div className="analysis-layout"><div className="feature-chessboard analysis-board">{[8,7,6,5,4,3,2,1].flatMap(rank=>"abcdefgh".split("").map(file=>{const sq=(file+rank) as Square;const piece=analysisBoard.get(sq);return <div key={sq} className={(file.charCodeAt(0)-97+rank)%2?"dark":"light"}>{piece?pieceGlyph[piece.color+piece.type]:null}</div>}))}</div><div className="analysis-moves"><strong>Zugnavigation</strong><p>{analysisIndex===0?"Ausgangsstellung":parsedAnalysis.moves[analysisIndex-1]||"Endstellung"}</p><div><button className="feature-action secondary" onClick={()=>setAnalysisIndex(i=>Math.max(0,i-1))}>Zurück</button><button className="feature-action" onClick={()=>setAnalysisIndex(i=>Math.min(parsedAnalysis.moves.length,i+1))}>Weiter</button></div><small>{analysisIndex} / {parsedAnalysis.moves.length} Halbzüge</small></div></div></>:<p className="feature-muted">Gib eine Partie-ID ein oder öffne eine Partie aus deiner Spielhistorie.</p>}</section>}
        {section==="tv"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Live-Kanäle</strong><span>{tvChannels.length} Kanäle</span></div><div className="feature-channel-grid">{tvChannels.map(channel=><button key={channel} className={tvChannel===channel?"selected":""} onClick={()=>setTvChannel(channel)}>{channel.replace(/([A-Z])/g," $1").toUpperCase()}</button>)}</div><div className="feature-tv-current"><strong>{tvGameId?"Live-Partie verfügbar":"Kanal ausgewählt"}</strong><p className="feature-muted">{tvGameId?"Die Partie kann direkt im Openboard-Analysebrett geöffnet werden.":"Für diesen Kanal wird gerade keine Partie-ID bereitgestellt."}</p>{tvGameId&&<a className="feature-action" href={appPath("/features/analysis/")+"?gameId="+encodeURIComponent(tvGameId)}>Partie in Openboard öffnen <ArrowRight size={15}/></a>}</div></section>}
        {section==="storm"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Deine Puzzle-Storm-Statistik</strong><span>LIVE-DATEN</span></div>{storm?<pre className="feature-json">{JSON.stringify(storm,null,2)}</pre>:<p className="feature-muted">Verbinde dein Konto, um deine Bestwerte und deinen Trainingsverlauf zu laden.</p>}<a className="feature-action" href={appPath("/features/puzzles/")}>Taktik trainieren <ArrowRight size={15}/></a></section>}
        {section==="learn"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Lernzentrum</strong><span>TRAININGSBEREICHE</span></div><div className="feature-learning-grid"><a href={appPath("/features/puzzles/")}><Puzzle/> <strong>Taktik</strong><small>Motive erkennen und Kombinationen berechnen</small></a><a href={appPath("/features/analysis/")}><BarChart3/> <strong>Partieanalyse</strong><small>Eigene Züge verstehen und verbessern</small></a><a href={appPath("/features/tv/")}><Tv/> <strong>Meisterpartien</strong><small>Starke Spieler live beobachten</small></a></div></section>}
        {section==="settings"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Darstellung</strong><span>LOKAL GESPEICHERT</span></div><div className="feature-data-row"><div className="feature-row-main"><strong>Farbschema</strong><small>Wird für alle Openboard-Seiten übernommen.</small></div><button className="feature-action" onClick={toggleTheme}>{theme==="dark"?"Helles Design":"Dunkles Design"}</button></div><div className="feature-data-row"><div className="feature-row-main"><strong>Kontoverbindung</strong><small>Die Spiel- und Kontodaten werden von Lichess bereitgestellt.</small></div><a className="feature-action secondary" href={appPath("/")}>Konto verwalten</a></div></section>}
        {section==="about"&&<section className="feature-panel"><div className="feature-panel-head"><strong>Openboard</strong><span>UNABHÄNGIGER CLIENT</span></div><p className="feature-muted">Openboard entwickelt eine eigenständige, durchgängige Schachoberfläche. Lichess bleibt die technische Basis für Konten, Spielbetrieb und öffentliche Schachdaten. Die Bedienung und Navigation erfolgen innerhalb von Openboard.</p></section>}
        <section className="feature-shortcuts"><a href={appPath("/play/")}><Swords size={17}/> Partie starten <ArrowRight size={14}/></a><a href={appPath("/features/analysis/")}><BarChart3 size={17}/> Analyse <ArrowRight size={14}/></a><a href={appPath("/features/history/")}><CalendarDays size={17}/> Spielhistorie <ArrowRight size={14}/></a></section>
        <footer className="feature-footer">Openboard · Eigenständige Oberfläche · Lichess als Backend</footer>
      </main>
    </div>
  </div>;
}
