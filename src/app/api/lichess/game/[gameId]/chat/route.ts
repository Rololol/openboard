import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Context = { params: Promise<{ gameId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const { gameId } = await context.params;
  if (!/^[a-zA-Z0-9]{8}$/.test(gameId)) {
    return NextResponse.json({ error: "Ungültige Partie-ID." }, { status: 400 });
  }
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "Bitte zuerst mit Lichess verbinden." }, { status: 401 });
  }

  let input: { text?: string };
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Ungültige Nachricht." }, { status: 400 });
  }
  if (typeof input.text !== "string" || !input.text.trim() || input.text.length > 200) {
    return NextResponse.json({ error: "Nachrichten müssen 1 bis 200 Zeichen lang sein." }, { status: 400 });
  }

  const upstream = await fetch(`https://lichess.org/api/board/game/${gameId}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Openboard (https://github.com/Rololol/openboard)",
    },
    body: JSON.stringify({ room: "player", text: input.text.trim() }),
    cache: "no-store",
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: await upstream.text() || "Nachricht konnte nicht gesendet werden." }, { status: upstream.status });
  }
  return NextResponse.json({ ok: true });
}
