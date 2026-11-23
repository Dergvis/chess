# Analytics and admin 2.0

## First-party statistics (`/api/site-events/`)
- Every event carries a per-tab visit id `v` (sessionStorage) and an anonymous player id `p`
  (random 16-hex in localStorage `chezzies-player`; empty when storage is blocked → visit-only).
  No name, e-mail, IP or account link is stored. Rows older than 395 days (~13 months) are deleted.
- Kinds: `screen` (game section, once per visit), `event` (`game:<name>` with sanitized params),
  `click` (delegated listener on `button, a, [role=button]`; label = `data-track` → aria-label/title →
  visible text, max 40 chars, plus current screen; never input values), `ping` (every 30 s while visible).
- Params: keys `[A-Za-z][A-Za-z0-9_]{0,29}`, values = short codes `[A-Za-z0-9_-]{1,40}`, finite numbers,
  booleans; max 12; everything else is dropped (client `src/analyticsCore.ts` and server `api/_stats.mjs`).
  Premium/payment/paywall/subscription events are never sent.
- `game_abandoned` {id, level, opponent, moves (half-moves), reason hidden|left|new_game, screen}: sent when
  a started game has no result and the tab hides, the page unloads, or a new game starts. If the game is
  finished later (same id), the admin does not count it as abandoned.
- Tag `data-track="..."` on a button to give it a stable name; `data-track-off` on a container disables clicks.

## Google Analytics 4 (G-NCWBHEH877, only after cookie consent)
Sent in addition to the old events: `game_section_view` {section}, every game event under its own name
with the same params (without the game id), `button_click` {label, screen}, `game_abandoned`.

Mark these as **Key events** in GA4 (Admin → Data display → Events → star):
`game_started`, `game_finished`, `first_win`, `puzzle_solved`, `challenge_completed`, `guardian_defeated`,
`registration_completed`, `return_visit`, `play_click`.
Useful but not key: `game_result` (param `result`), `game_abandoned`, `button_click`, `game_section_view`.
To use params in reports, add custom dimensions (event scope): `level`, `opponent`, `result`, `reason`,
`section`, `label`, `screen`, `hero`.

## Admin API (behind the admin session cookie)
`/api/admin/stats?days=`, `/api/admin/players?days=&q=`, `/api/admin/player?id=`, `/api/admin/retention?days=`,
`/api/admin/games?days=`, `/api/admin/seo`, `/api/admin/support`, `POST /api/admin/reply`.
Retention: D1 = came back the next day, D7/D30 = came back within 7/30 days; cohorts too young are `null`.

## Search Console import (pult → site)
`POST /api/admin/seo-import/` with header `x-import-token: $ADMIN_IMPORT_TOKEN` (Vercel env; missing → 503),
body `{kind, data}`. Latest 60 snapshots per kind are kept; the admin shows the newest one.
- `queries`: `{period:{start,end}, totals:{clicks,impressions,ctr,position}, rows:[{query,clicks,impressions,ctr,position}]}`
- `pages`: `{period, rows:[{page,clicks,impressions,ctr,position}]}`
- `index`: `{indexed, notIndexed, reasons:[{reason,n}]?, pages:[{url,state:'indexed'|'not_indexed',reason,lastCrawl}]}`
`ctr` may be a fraction (0.025) or percent (2.5).

## Admin app
`/admin/` is installable (manifest, icons, `sw.js` scoped to `/admin/`, network-first shell, never caches `/api/`).

## Board trail and Help link (24.11)
- Board events (all boards via `GameScreen` `trailMode`: arena, puzzle, training, classic), first-party only, not sent to Google:
  `game:move_made` (piece, from, to, move, capture, promotion, mode), `game:move_rejected` (piece, from, to, reason `not_legal|opponent_piece`),
  `game:illegal_tap` (square, reason `empty|opponent_piece|wait`), `game:drag_attempt` (piece, own, from, to, how `move|cancel`, n),
  `game:drag_hint_shown`. Limits (`createBoardTrail` in `src/analyticsCore.ts`): 200 events per board, drag_attempt once per 3 s, same rejected tap once per second.
  3 drag attempts with no successful move → one-time hint on the board ("Tap a piece, then tap the square to move it", ES in `docs/i18n/es.json`).
- Help: the widget sends the anonymous player id `p`; stored in `international_support_requests.player_id` (nullable); event `game:help_sent`.
  `/api/admin/support` returns `player_id` and, for accounts, registration date + short progress summary (no e-mail, child name or password data).
  Admin «Помощь» → «Что делал игрок» opens the player card; the card lists each visit in order, time to the second and +m:ss from the visit start.
