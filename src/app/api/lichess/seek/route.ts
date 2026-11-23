import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Bitte zuerst mit Lichess verbinden." }, { status: 401 });

  let input: { time?: number; increment?: number; rated?: boolean };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 }); }

  const time = Number(input.time);
  const increment = Number(input.increment);
  if (!Number.isFinite(time) || time < 10 || time > 180 || !Number.isInteger(increment) || increment < 0 || increment > 180) {
    return NextResponse.json({ error: "Die Board-API-Spielsuche unterstützt hier nur Rapid und Klassisch (ab 10 Minuten)." }, { status: 400 });
  }

  const body = new URLSearchParams({
    time: String(time),
    increment: String(increment),
    rated: input.rated === true ? "true" : "false",
    variant: "standard",
    color: "random",
  });

  try {
    const upstream = await fetch("https://lichess.org/api/board/seek", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/plain, application/json",
        "User-Agent": "Openboard (https://github.com/Rololol/openboard)",
      },
      body,
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok) {
      const message = await upstream.text();
      return NextResponse.json({ error: message || "Lichess konnte die Spielsuche nicht starten." }, { status: upstream.status });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 204 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verbindung zu Lichess fehlgeschlagen." }, { status: 502 });
  }
}
