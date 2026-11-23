import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ gameId: string }> };
function validGameId(value: string) { return /^[a-zA-Z0-9]{8}$/.test(value); }

export async function POST(_request: NextRequest, context: Context) {
  const { gameId } = await context.params;
  if (!validGameId(gameId)) return NextResponse.json({ error: "Ungültige Partie-ID." }, { status: 400 });
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Bitte zuerst mit Lichess verbinden." }, { status: 401 });
  const upstream = await fetch(`https://lichess.org/api/board/game/${gameId}/resign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessToken}`, "User-Agent": "Openboard (https://github.com/Rololol/openboard)" },
    cache: "no-store",
  });
  if (!upstream.ok) return NextResponse.json({ error: await upstream.text() || "Aufgabe konnte nicht übergeben werden." }, { status: upstream.status });
  return NextResponse.json({ ok: true });
}
