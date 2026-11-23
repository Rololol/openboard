import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = await fetch("https://lichess.org/api/account", {
    headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/json", "User-Agent": "Openboard (https://github.com/Rololol/openboard)" },
    cache: "no-store",
  });

  if (response.status === 401) {
    session.destroy();
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: "Lichess-Profil konnte nicht geladen werden." }, { status: response.status });
  }

  const account = await response.json();
  return NextResponse.json({ authenticated: true, account }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
