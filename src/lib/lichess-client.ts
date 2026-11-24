const LICHESS = "https://lichess.org";
const CLIENT_ID = "openboard-rololol";
const SCOPES = "board:play challenge:read challenge:write follow:read";
const TOKEN_KEY = "openboard_lichess_token";
const VERIFIER_KEY = "openboard_pkce_verifier";
const STATE_KEY = "openboard_oauth_state";

export function appPath(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [pathname, query] = path.split("?", 2);
  const normalized = pathname === "/" || pathname.endsWith("/") ? pathname : pathname + "/";
  return base + normalized + (query ? "?" + query : "");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function beginLichessLogin() {
  const verifier = randomToken(48);
  const state = randomToken(24);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  const redirectUri = window.location.origin + appPath("/auth/callback");
  const url = new URL("/oauth", LICHESS);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: SCOPES,
  }).toString();
  window.location.assign(url.toString());
}

export async function completeLichessLogin() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error) throw new Error("Lichess-Anmeldung abgebrochen: " + error);
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    throw new Error("Ungültige OAuth-Antwort. Bitte erneut anmelden.");
  }
  const redirectUri = window.location.origin + appPath("/auth/callback");
  const response = await fetch(LICHESS + "/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Lichess konnte das Zugriffstoken nicht ausstellen (" + response.status + ").");
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Lichess hat kein Zugriffstoken zurückgegeben.");
  sessionStorage.setItem(TOKEN_KEY, payload.access_token);
}

export async function lichessFetch(path: string, init: RequestInit = {}) {
  const token = getAccessToken();
  if (!token) throw new Error("Bitte zuerst mit Lichess verbinden.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + token);
  if (!headers.has("Accept")) headers.set("Accept", path.includes("/stream/") || path === "/api/stream/event" || path === "/api/board/seek" ? "application/x-ndjson" : "application/json");
  const response = await fetch(LICHESS + path, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") sessionStorage.removeItem(TOKEN_KEY);
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Lichess-Anfrage fehlgeschlagen (" + response.status + ").");
  }
  return response;
}

export async function lichessJson<T>(path: string, init: RequestInit = {}) {
  const response = await lichessFetch(path, init);
  return await response.json() as T;
}

export async function logoutLichess() {
  const token = getAccessToken();
  if (token) {
    try {
      await fetch(LICHESS + "/api/token", { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    } catch { /* Clear the local session even if revocation is temporarily unavailable. */ }
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
}
