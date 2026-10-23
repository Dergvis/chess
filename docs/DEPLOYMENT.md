# International deployment

Frontend: existing Vercel project connected to Dergvis/chess, branch international-site. Never merge to main without the owner’s explicit approval. Vercel builds `npm run build`, publishes `dist` and deploys `api/backend.mjs` for account and save APIs. Preview HTML is noindex. There is no generic SPA fallback for marketing URLs or unknown game routes.

## Vercel and Neon account storage

The Vercel project has a Neon database connected for Preview and Production. `DATABASE_URL` is supplied by the integration; do not put it in Git or expose it to browser code. The API creates `international_*` tables on first use, hashes passwords with scrypt, uses opaque HttpOnly session cookies, and stores each account's world save and player progress under its user ID. It does not read the Russian production database. Preview database branching was enabled on 13 October 2026; Preview accounts and saves do not automatically transfer to Production. The Resend domain `chezzies.app` was verified on 13 October; its DKIM, sending CNAME and DMARC records are in Vercel DNS. Vercel has `RESEND_API_KEY` (secret, Resend sending access scoped to `chezzies.app`) and `RESET_EMAIL_FROM=CHEZZIES <accounts@chezzies.app>` for Preview and Production.

The owner received the new HTML reset email, changed the password and signed back in on Preview. Commit `7314fb2` was promoted as Production deployment `CbyrKz2WAo2FbHKfa3SpW6gx4YkM` on 13 October 2026. The owner then registered on `chezzies.app` and confirmed that the selected hero and progress restored in another session. The follow-up commit `6d988df` was promoted as Production deployment `D9ygp28CWqX9XkfDo3eK3xnmQWeN` to hide the disconnected legacy Help chat; the live login page was checked after promotion.

Preview verification on 13 October: deployment `1faa418` created a new test account without a false save warning; after choosing Laserhorse, a second Preview origin with independent browser storage signed in and restored Laserhorse from Neon. The first synthetic account was created before Preview branching was enabled, so that test row is also present in the main Neon database. Remove synthetic rows through the Neon data editor after the owner's two-factor verification, or leave them inert until a maintenance window; they use `example.invalid` addresses and cannot receive mail.

Account-isolation QA found that registering from the sign-in screen could mark a previous browser save for guest import even when the player had not chosen to save a guest adventure. The UI now marks import only from the in-game guest save action. Deployment `d21466e` passed the retest on Preview: after a returning account restored Officer Cannon, signing out and registering a different account in the same browser showed hero selection rather than Officer Cannon.

## Retired separate-service option

The owner chose separate accounts and progress from chezzies.ru. The production server source was obtained from `C:/Users/Max/Desktop/chezzies-api`. Only server.js, world-routes.cjs, promo-routes.js and package manifests were copied. No environment files, signing keys, cookies, databases, user saves or logs were imported.

The `server/` directory remains as an archival option; the deployed account API uses Neon in `api/neon-account.mjs`. Do not deploy the legacy service alongside the live Neon account API. Never mount the Russian database or world-data directory here.

The old bridge would need its own HTTPS service and secrets if ever chosen as a replacement architecture. It is not required for the current Vercel deployment.

Help questions are forwarded to the private Telegram group with a ticket number and saved in Neon. Reply directly to the bot's question message in the group; a production Telegram webhook maps that reply to the ticket and shows it in Help within 30 seconds while the panel is open. The webhook is registered on the first new production question after deployment, using a secret derived server-side from `TELEGRAM_BOT_TOKEN`. Older questions sent before this change do not have Telegram message IDs and cannot receive linked replies. Signed-in users see questions and answers across devices; guests can see them in the same browser via an HttpOnly guest cookie. The bot token stays in Vercel server-only secrets, never in Git or browser code. Five questions per account or IP per 15 minutes are allowed. The group chat ID is configured as `TELEGRAM_CHAT_ID`.

Optional Google Analytics uses measurement ID `G-NCWBHEH877` after visitor consent. Its implementation excludes names, email addresses and save contents. First-party site events remain allowlisted and anonymous.

## Local verification

`npm ci`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.

Backend: Node 24, `cd server`, `npm ci`, set `DATA_DIR` to an empty test directory, `PORT=4303`, then `node server.js`. Local preview: set `LOCAL_API_ORIGIN=http://127.0.0.1:4303`, then `npm run preview`. The local proxy does not run in the deployed frontend.

The scripts `backend-smoke.cjs` and `browser-game.cjs` create synthetic accounts only on localhost. Browser scripts currently use the installed local Chrome and Playwright runtime; adjust their runtime path on another machine. The original world/challenge tests remain under src/world and can be bundled with esbuild for Node.

## IndexNow

Optional `INDEXNOW_KEY` emits the matching public key file during build. After an approved production deployment is actually live, run `VERCEL_ENV=production CONFIRM_PUBLISHED=true npm run indexnow` with that key. The command checks the live key file before submitting the eight canonical URLs. Do not submit previews. Submission does not guarantee indexing.
