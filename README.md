# Openboard

An independent, responsive Lichess client. Lichess remains the source of truth for accounts, ratings, matchmaking, games, tournaments, and history.

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS v4
- chessops for chess rules and position handling
- Stockfish WASM for local analysis (planned)
- Official Lichess HTTP and streaming APIs

## Development

Requirements: Node.js 20.9+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment

Create an OAuth application in your Lichess account settings and configure the values in `.env.local`. Never commit real credentials or access tokens.

- `LICHESS_CLIENT_ID`
- `LICHESS_CLIENT_SECRET`
- `APP_URL`
- `SESSION_SECRET`

## Current status

Phase 1 scaffold: responsive navigation and dashboard shell are committed. The Lichess connection control is intentionally disabled until the OAuth callback, secure server-side token storage, and session handling are implemented. No matchmaking or live game behavior is mocked.

## Roadmap

1. Lichess OAuth and authenticated profile
2. Real matchmaking and challenges via Lichess
3. Live Board API game state, move submission, clocks, chat, and reconnect handling
4. Analysis, puzzles, opening explorer, tournaments, and statistics
