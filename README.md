# Openboard

Openboard is an independent, mobile-first Lichess client with a chess-club interface. Lichess remains the source of truth for accounts, ratings, matchmaking, game state, and chat.

## GitHub Pages deployment

The site is built as a static Next.js export and deployed by GitHub Actions. No Render, Vercel, or other application host is used.

After the GitHub Pages deployment workflow succeeds, the site is available at:

`https://rololol.github.io/openboard/`

The repository must allow GitHub Actions to deploy Pages. The deployment workflow attempts to enable/configure Pages automatically; if repository settings prevent that, set **Settings → Pages → Build and deployment → Source → GitHub Actions** once.

## Lichess login and token handling

Openboard uses the browser-based OAuth 2.0 Authorization Code flow with PKCE, following the public-client approach used by the official Lichess API demo. No client secret or server is required.

The access token is held in the browser's `sessionStorage` and sent directly to `https://lichess.org` over HTTPS. It is not committed to GitHub or sent to an Openboard server. Because this is a static website, the token is accessible to JavaScript running on the Openboard origin; keep the browser up to date and do not install untrusted browser extensions. Logging out also asks Lichess to revoke the token.

The OAuth redirect URI is:

`https://rololol.github.io/openboard/auth/callback`

## Implemented

- Responsive mobile-first dashboard with Lichess ratings and account activity
- Lichess OAuth PKCE login and logout
- Real Lichess Rapid/Classical random matchmaking
- Live game board with legal move selection and promotion
- Live player clocks and SAN move list
- Player chat
- Draw offers and responses
- Takeback offers and responses
- Resignation
- GitHub Actions type-check, lint, static build, and GitHub Pages deployment

## Lichess API constraints

The Board API supports random seeks for Rapid, Classical, and Correspondence time controls. Ordinary random Blitz and Bullet seeks are not available through this API, so Openboard does not display unsupported matchmaking queues. Direct challenges are a separate feature and are not yet implemented.

Engine assistance is forbidden by Lichess fair-play rules during live games. Openboard does not provide engine assistance during a live game.

## Local development

Requirements: Node.js 20.9+.

```bash
npm install
npm run dev
```

The app can be tested locally at `http://localhost:3000`. Lichess OAuth will return to the local callback route.

## Current limitations

The current release focuses on login, matchmaking, and live games. Direct challenges, puzzles, learning lessons, analysis, opening explorer, tournaments, and game history are not implemented. The live-game integration has not yet been validated with two real Lichess accounts in a deployed environment.
