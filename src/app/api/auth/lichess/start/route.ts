import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.LICHESS_CLIENT_ID || "openboard-rololol";
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL ist nicht konfiguriert." }, { status: 500 });
  }

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/auth/lichess/callback", appUrl).toString();

  const session = await getSession();
  session.oauthState = state;
  session.codeVerifier = verifier;
  await session.save();

  const authorize = new URL("https://lichess.org/oauth");
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: "board:play challenge:read challenge:write",
  }).toString();

  return NextResponse.redirect(authorize);
}
