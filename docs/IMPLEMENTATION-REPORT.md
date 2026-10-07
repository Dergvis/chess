# CHEZZIES international — implementation report

## Source and scope

The outdated Dergvis/chess April application was replaced using the actual current CHEZZIES source. An unchanged build of ../world-dev matched all five production v18 HTML/JS/CSS files byte for byte. The owner supplied the current backend folder, whose server and world-route files match the audited deployment package. See PRODUCTION-SOURCE-VERIFICATION.md.

## Changed

- / is a static, cinematic homepage using original CHEZZIES map and toy-army art. Includes world progression preview, original legal knight-fork challenge, parent explanation and links into /play/.
- /play/ uses the current App/WorldApp, chess engine, board, heroes, fortress stages, guardians, Arena, training ground, progress, account flow and guest-to-account save merge. The engine was not replaced.
- English game labels, tactical feedback, hints, catalogue explanations, guide, map, heroes, onboarding, profile and authentication. CSS-generated map labels and date formatting localized too.
- PAYMENTS_ENABLED=false. Gates allow international content without purchase while normal journey prerequisites remain. Payment routes redirect to play, guest piece-animation restrictions are disabled, signup has no promo/checkout step, and payment events are excluded.
- Separate international server configuration, database directory/name and session cookie. No Russian customer data imported. Node 24 built-in SQLite uses the existing SQL schema and queries. Persistence initialization fails closed instead of losing data in an in-memory fallback.
- Restricted Vercel API bridge requires a configured international HTTPS backend and bridge token; it rejects chezzies.ru. Server payments are blocked even if called directly.
- Anonymous first-party events: homepage_view, landing_view, play_click, game_start, puzzle_start, puzzle_complete, return_visit, signup_start, signup_complete. Allowlisted source and initial landing page only. No names/emails/query strings/full referrers in telemetry.

## Removed or retired

- Old repository src/public implementation, April-only fix reports, legacy PWA entry and old global analytics tracker.
- Tracked node_modules and dist; reproducible builds now come from package manifests.
- Unneeded mobile packaging/PWA build dependencies. Payment backend code is retained behind the international configuration; the actual Russian backend is untouched.
- Legacy Workbox cache is retired by sw.js when old browsers update the worker.

## Routes and retrieval

/, /play/, /chess-games-for-kids/, /online-chess-for-kids/, /learn-chess-for-kids/, /how-to-play-chess-for-kids/, /chess-puzzles-for-kids/, /parents/.

Marketing content is available in initial HTML. Each page has a unique title/description, one H1, canonical URL, Open Graph/Twitter metadata, semantic headings, internal links and consistent WebSite/Organization/SoftwareApplication JSON-LD; subpages add BreadcrumbList. No fabricated ratings, age range, scientific results or reviews. Original optimized artwork with lazy loading below the fold and locally hosted fonts. Sitemap, robots, actual 404 page, allowlisted game rewrites and optional production-only IndexNow script. Preview pages are noindex.

Future tactic URLs and /research/ are not filled with speculative content. The puzzle page has genuine tactic sections with fragment links instead.

## Verification performed locally

- Production build, TypeScript and lint.
- Original world engine suites: legal positions and moves, chess rules including castling/en passant/underpromotion, rewards, hero progression, save migration, account isolation and movement.
- Original challenge suites: 272 prepared positions, accepted solutions, tactical geometry, defense continuations, adaptation, stage ordering, guardians, extensibility and experience selection.
- Integration tests: unique static metadata/one H1, real homepage fork, no Russian backend fallback, payment route exclusion.
- Browser: homepage at 320/375/390/768/1440 px without page overflow; correct homepage move earns its star.
- Browser game: hero selection, experience, tour/map, three real puzzles, first fortress stage, reload persistence, guest-to-account registration, logout and login. Map at 320/375/390/768/1440, puzzle at 320/390/768/1440. No browser exceptions or billing requests in that scenario.
- Real local backend with synthetic accounts: registration/login/logout, cookie session, world save/load, stale-write rejection, two-account isolation, anonymous save rejection and blocked billing.

## Release gates and limits

1. The separate international backend has not been provisioned online. The Vercel bridge needs CHEZZIES_API_ORIGIN and API_BRIDGE_TOKEN. The local source folder alone cannot create a persistent online service. Until connected, Preview supports guest play and clearly reports unavailable account service.
2. Configure an international SMTP sender and verify the actual password reset email and live cross-device save flow. No real emails, customer accounts or production payments were used in tests.
3. The promised approved homepage mockup has not been supplied. The draft uses the verified game artwork; exact design comparison remains pending.
4. Mobile checks use Chrome viewport emulation, not physical Safari/iOS devices. No claim of measured field Core Web Vitals or guaranteed search/AI inclusion.
5. Vite reports a large game bundle and an existing mixed static/dynamic import warning. The marketing layer loads a much smaller bundle. Dependency audit still contains inherited advisories and should be addressed before production promotion.
6. No automatic merge to main, production domain switch or IndexNow submission.
