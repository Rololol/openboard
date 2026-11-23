import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Context = { params: Promise<{ gameId: string; action: string }> };

export async function POST(_request: NextRequest, context: Context) {
  const { gameId, action } = await context.params;
  if (!/^[a-zA-Z0-9]{8}$/.test(gameId)) {
    return NextResponse.json({ error: "Ungültige Partie-ID." }, { status: 400 });
  }
  if (!["yes", "no", "accept"].includes(action)) {
    return NextResponse.json({ error: "Ungültige Remis-Aktion." }, { status: 400 });
  }

  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "Bitte zuerst mit Lichess verbinden." }, { status: 401 });
  }

  const upstream = await fetch(`https://lichess.org/api/board/game/${gameId}/draw/${action}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "User-Agent": "Openboard (https://github.com/Rololol/openboard)",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: await upstream.text() || "Remis-Aktion wurde von Lichess abgelehnt." },
      { status: upstream.status },
    );
  }
  return NextResponse.json({ ok: true });
}
