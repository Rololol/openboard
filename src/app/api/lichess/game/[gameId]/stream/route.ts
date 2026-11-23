import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ gameId: string }> };
function validGameId(value: string) { return /^[a-zA-Z0-9]{8}$/.test(value); }

export async function GET(request: NextRequest, context: Context) {
  const { gameId } = await context.params;
  if (!validGameId(gameId)) return NextResponse.json({ error: "Ungültige Partie-ID." }, { status: 400 });
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Bitte zuerst mit Lichess verbinden." }, { status: 401 });

  try {
    const upstream = await fetch(`https://lichess.org/api/board/game/stream/${gameId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/x-ndjson", "User-Agent": "Openboard (https://github.com/Rololol/openboard)" },
      cache: "no-store",
      signal: request.signal,
    });
    if (!upstream.ok) return NextResponse.json({ error: await upstream.text() || "Partiestream nicht verfügbar." }, { status: upstream.status });
    return new Response(upstream.body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 204 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verbindung zu Lichess fehlgeschlagen." }, { status: 502 });
  }
}
