import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL("/", process.env.APP_URL || request.nextUrl.origin);
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const session = await getSession();

  if (error) {
    session.oauthState = undefined;
    session.codeVerifier = undefined;
    await session.save();
    url.searchParams.set("auth", "denied");
    return NextResponse.redirect(url);
  }

  if (!code || !state || !session.oauthState || !session.codeVerifier || state !== session.oauthState) {
    session.oauthState = undefined;
    session.codeVerifier = undefined;
    await session.save();
    url.searchParams.set("auth", "invalid_state");
    return NextResponse.redirect(url);
  }

  const clientId = process.env.LICHESS_CLIENT_ID || "openboard-rololol";
  const redirectUri = new URL("/api/auth/lichess/callback", process.env.APP_URL || request.nextUrl.origin).toString();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: session.codeVerifier,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  const tokenResponse = await fetch("https://lichess.org/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "Openboard (https://github.com/Rololol/openboard)" },
    body,
    cache: "no-store",
  });

  session.oauthState = undefined;
  session.codeVerifier = undefined;

  if (!tokenResponse.ok) {
    await session.save();
    url.searchParams.set("auth", "token_error");
    return NextResponse.redirect(url);
  }

  const token = (await tokenResponse.json()) as { access_token?: string; token_type?: string };
  if (!token.access_token) {
    await session.save();
    url.searchParams.set("auth", "token_error");
    return NextResponse.redirect(url);
  }

  session.accessToken = token.access_token;
  const accountResponse = await fetch("https://lichess.org/api/account", {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json", "User-Agent": "Openboard (https://github.com/Rololol/openboard)" },
    cache: "no-store",
  });

  if (accountResponse.ok) {
    const account = (await accountResponse.json()) as { username?: string };
    session.username = account.username;
  }

  await session.save();
  url.searchParams.set("auth", "success");
  return NextResponse.redirect(url);
}
