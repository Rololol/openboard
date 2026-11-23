import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type OpenboardSession = {
  accessToken?: string;
  oauthState?: string;
  codeVerifier?: string;
  username?: string;
};

function options(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.");
  }

  return {
    cookieName: "openboard_session",
    password,
    ttl: 60 * 60 * 24 * 365,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  };
}

export async function getSession() {
  return getIronSession<OpenboardSession>(await cookies(), options());
}
