# Openboard

An independent, responsive Lichess client. Lichess remains the source of truth for accounts, ratings, matchmaking, games, tournaments, and history.

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS v4
- iron-session for encrypted, HttpOnly cookie sessions
- chessops for chess rules and position handling
- Stockfish WASM for local analysis (planned)
- Official Lichess HTTP and streaming APIs

## Development

Requirements: Node.js 20.9+.

```bash
npm install
cp .env.example .env.local
# Set SESSION_SECRET to a random value of at least 32 characters.
npm run dev
```

Open http://localhost:3000.

## Environment

- `LICHESS_CLIENT_ID`: optional unique public OAuth client identifier (defaults to `openboard-rololol`)
- `APP_URL`: application origin, including scheme (for local development: `http://localhost:3000`)
- `SESSION_SECRET`: random secret of at least 32 characters; generate with `openssl rand -base64 48`

Lichess supports the OAuth 2.0 authorization-code flow with PKCE for unregistered public clients. No client secret is required. The access token is stored in an encrypted, HttpOnly, SameSite=Lax cookie and is never returned to browser JavaScript. Lichess tokens are long-lived and do not use refresh tokens; users can revoke them from their Lichess account settings.

The callback URL is `{APP_URL}/api/auth/lichess/callback`.

## Implemented

- Responsive chess-club dashboard and navigation shell
- Mobile-first matchmaking page with rated/casual selection and Rapid/Classical time controls
- Authenticated Lichess Board API seek proxy and live account event stream proxy
- Native live chessboard with legal move selection, promotion choice, SAN move list, player clocks, and resignation
- Lichess OAuth 2.0 Authorization Code + PKCE start/callback flow
- State validation and encrypted server-side session cookie
- Authenticated account proxy and profile/rating display
- Logout

## Not yet implemented

Direct challenges, chat, puzzles, analysis, opening explorer, tournaments, and game history are not implemented yet. Matchmaking is wired to the official seek and account-event streams, but has not yet been verified end-to-end against a deployed OAuth app. The UI does not simulate these features.

## Important Lichess API constraint

The official Board API supports random seeks for Rapid, Classical, and Correspondence time controls. Blitz is available for direct challenges and games against AI, but not for ordinary random seeks through the Board API. Openboard will expose only matchmaking options supported by Lichess rather than faking unsupported queues.

## Roadmap

1. OAuth and authenticated profile (implemented)
2. Lichess Board API matchmaking and direct challenges
3. Direct challenges, chat, reconnect handling, draw offers, and takebacks
4. Analysis, puzzles, opening explorer, tournaments, and statistics
