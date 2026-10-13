# International deployment

Frontend: existing Vercel project connected to Dergvis/chess, branch international-site. Never merge to main without the owner’s explicit approval. Vercel builds `npm run build`, publishes `dist` and deploys `api/backend.mjs` for account and save APIs. Preview HTML is noindex. There is no generic SPA fallback for marketing URLs or unknown game routes.

## Vercel and Neon account storage

The Vercel project has a Neon database connected for Preview and Production. `DATABASE_URL` is supplied by the integration; do not put it in Git or expose it to browser code. The API creates `international_*` tables on first use, hashes passwords with scrypt, uses opaque HttpOnly session cookies, and stores each account's world save and player progress under its user ID. It does not read the Russian production database. Preview database branching was enabled on 13 October 2026 for future deployments; older Preview deployments shared the main database. A new Preview deployment is required to exercise the isolated branch. Password reset needs `RESEND_API_KEY` and `RESET_EMAIL_FROM` in Vercel before the account release. Do not promote the account change until a test email and reset flow pass.

Preview verification on 13 October: deployment `1faa418` created a new test account without a false save warning; after choosing Laserhorse, a second Preview origin with independent browser storage signed in and restored Laserhorse from Neon. The first synthetic account was created before Preview branching was enabled, so that test row is also present in the main Neon database. Remove synthetic rows through the Neon data editor after the owner's two-factor verification, or leave them inert until a maintenance window; they use `example.invalid` addresses and cannot receive mail.

Account-isolation QA found that registering from the sign-in screen could mark a previous browser save for guest import even when the player had not chosen to save a guest adventure. The UI now marks import only from the in-game guest save action. Retest a new account after this change: it must start with hero selection, while a returning account restores its own hero.

## Legacy separate-service option

The owner chose separate accounts and progress from chezzies.ru. The production server source was obtained from `C:/Users/Max/Desktop/chezzies-api`. Only server.js, world-routes.cjs, promo-routes.js and package manifests were copied. No environment files, signing keys, cookies, databases, user saves or logs were imported.

Run `server/Dockerfile` as a NEW service with a persistent disk mounted at `/data`. The source preserves the existing auth/password hashing, sessions, guest merge and world-save format. Node 24's built-in SQLite driver replaces the old native driver while retaining the existing SQL schema and queries. It fails on database initialization errors instead of silently using memory. The database and cookie names are international-specific. Never mount the Russian database or world-data directory here.

Service variables: see `server/.env.example`. Configure HTTPS, `PUBLIC_BASE_URL=https://chezzies.app`, a long random `API_BRIDGE_TOKEN`, `REQUIRE_BRIDGE=true`, and an international sender/SMTP account for password reset emails. The bridge forwards the session cookie without a Domain attribute, scoped to the website origin. The server has no payment endpoints exposed and does not subscribe to payment webhooks.

Vercel variables, scoped to Preview and later Production:
- `CHEZZIES_API_ORIGIN`: the new service’s HTTPS origin. chezzies.ru is explicitly rejected.
- `API_BRIDGE_TOKEN`: same secret as the new service.

Without these variables, account requests return a clear 503 and guest gameplay remains available. **A guest-only preview is not a complete account migration.** Provisioning the server and verifying live registration, email reset and cross-device saves remain release gates.

Analytics sends only allowlisted anonymous event names, broad source categories and known landing paths to `/api/site-events`. The service appends a bounded-shape envelope to `site-events.jsonl`; configure normal log rotation on the host. Passwords, child names, email addresses, query parameters, cookies and full referrers are excluded. Auth data is used separately for account operation.

## Local verification

`npm ci`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.

Backend: Node 24, `cd server`, `npm ci`, set `DATA_DIR` to an empty test directory, `PORT=4303`, then `node server.js`. Local preview: set `LOCAL_API_ORIGIN=http://127.0.0.1:4303`, then `npm run preview`. The local proxy does not run in the deployed frontend.

The scripts `backend-smoke.cjs` and `browser-game.cjs` create synthetic accounts only on localhost. Browser scripts currently use the installed local Chrome and Playwright runtime; adjust their runtime path on another machine. The original world/challenge tests remain under src/world and can be bundled with esbuild for Node.

## IndexNow

Optional `INDEXNOW_KEY` emits the matching public key file during build. After an approved production deployment is actually live, run `VERCEL_ENV=production CONFIRM_PUBLISHED=true npm run indexnow` with that key. The command checks the live key file before submitting the eight canonical URLs. Do not submit previews. Submission does not guarantee indexing.
