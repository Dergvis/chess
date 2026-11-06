# CHEZZIES.APP SEO/GEO audit

Checked 23 October 2026 against the live production host and the `international-site` source. Run `node scripts/audit-live.mjs` to repeat the HTTP audit. The changes in this sprint are intended for a Vercel Preview first; the live results below describe the existing production deployment, not an already published content change.

## Technical results

| URL | Production response / refresh | Robots / canonical / sitemap | Title / H1 | Current issue or follow-up |
| --- | --- | --- | --- | --- |
| `/` | 200, no redirect | `index,follow`; apex canonical; listed | CHEZZIES — Chess Adventure Game for Kids / Chess Becomes an Adventure | Verify indexing and non-brand queries in Search Console. |
| `/play/` | 200, no redirect | `index,follow`; apex canonical; listed | Play CHEZZIES — Free Online Chess Game for Kids / Play CHEZZIES | Game UI requires JS; server HTML has a short description and fallback. |
| `/chess-games-for-kids/` | 200, no redirect | `index,follow`; apex canonical; listed | Chess Games for Kids / Chess Games for Kids | Preview adds two genuine gameplay screenshots and concrete game features. |
| `/online-chess-for-kids/` | 200, no redirect | `index,follow`; apex canonical; listed | Online Chess for Kids / Online Chess for Kids | Production copy incorrectly describes cloud saves as unavailable; Preview fixes it. |
| `/learn-chess-for-kids/` | 200, no redirect | `index,follow`; apex canonical; listed | Learn Chess for Kids / Learn Chess for Kids | Production is short; Preview adds six practical steps. |
| `/how-to-play-chess-for-kids/` | 200, no redirect | `index,follow`; apex canonical; listed | How to Play Chess for Kids / How to Play Chess for Kids | Production is text-heavy; Preview adds board and real game-piece art. |
| `/chess-puzzles-for-kids/` | 200, no redirect | `index,follow`; apex canonical; listed | Chess Puzzles for Kids / Chess Puzzles for Kids | Production lacks positions; Preview adds five real challenges. |
| `/parents/` | 200, no redirect | `index,follow`; apex canonical; listed | CHEZZIES for Parents / They come to play. They discover chess. | Production copy incorrectly describes cloud saves as unavailable; Preview fixes it. |

All eight responses contain a description, internal links, and a JSON-LD graph. The graph uses Organization, WebSite, and SoftwareApplication; topic pages also contain BreadcrumbList. There are no invented ratings, reviews, or VideoObject claims. Fetching each URL directly is equivalent to a server-side hard refresh, though a browser-level refresh should also be checked in Preview.

`robots.txt` allows public pages and excludes `/api/`, `/play/account/`, and `/play/login/`. The live `sitemap.xml` contains only the eight apex URLs in the table, without internal game routes or redirects. The static generator protects Preview with `noindex,nofollow` and `Disallow: /`; production remains `index,follow` and `Allow: /`. Validate Preview headers and generated files after deployment.

The apex HTTP address and HTTPS `www` each make one 308 redirect to `https://chezzies.app/`. HTTP `www` makes two 308 hops, first to HTTPS `www`, then apex. The historical `https://www.chezzies.app/play/home` also makes two 308 hops: host normalization and trailing slash, then serves `/play/home/` with `X-Robots-Tag: noindex, follow`. The route works; redirecting it to `/play/` would change navigation. A past Search Console “Redirect error” must be rechecked using its current URL Inspection result, not inferred from HTTP status alone.

No Vercel domain change is indicated by the observed responses. In Vercel Dashboard, confirm `chezzies.app` is the Production primary domain and `www.chezzies.app` redirects to it; if either setting differs, set the apex as primary and `www` to redirect there. Do not point a domain at Preview.

## Content and search intent

All canonical URLs below use `https://chezzies.app` plus the listed path. Each page has one H1 and a unique title and description in `scripts/content.mjs` or the page generator. The sitemap and related-page blocks cover the natural path Games → Online → Learn → Puzzles → Play.

| Page | Primary intent / query; secondary queries | Title; description; H1 | Main H2 and real example | Internal links / CTA |
| --- | --- | --- | --- | --- |
| `/` | Discover the product; chess game for kids; chess adventure for kids | CHEZZIES — Chess Adventure Game for Kids; free browser chess adventure; Chess Becomes an Adventure | World, actual game features and homepage knight fork | Topic pages and Start Adventure → `/play/` |
| `/chess-games-for-kids/` | Find a game; chess games for kids; free chess games for kids | Chess Games for Kids; short challenges, computer opponents, fantasy world; Chess Games for Kids | Explore five territories, Develop a hero, Play an opponent; optimized actual map and challenge screenshots | Online, Puzzles, Play |
| `/online-chess-for-kids/` | Play online now; online chess for kids; chess online for kids | Online Chess for Kids; free browser adventure and Arena; Online Chess for Kids | Open game, Choose hero, Solve or play, Keep progress; guest vs account explanation | Games, Parents, Play |
| `/learn-chess-for-kids/` | Learn progressively; learn chess for kids; beginner chess for kids | Learn Chess for Kids; movement and tactics; Learn Chess for Kids | Six steps from pieces to Arena game, each linked to an existing guide or game activity | How to Play, Puzzles, Play |
| `/how-to-play-chess-for-kids/` | Understand rules; how to play chess for kids; chess rules for beginners | How to Play Chess for Kids; board, moves and checkmate; How to Play Chess for Kids | Meet the board and pieces; real CHEZZIES piece art, eight-by-eight board, piece rules, check/checkmate | Learn, Puzzles, Play |
| `/chess-puzzles-for-kids/` | Try tactics; chess puzzles for kids; checkmate puzzles for kids | Chess Puzzles for Kids; five tactics; Chess Puzzles for Kids | Checkmate, Fork, Pin, Double Attack, Defense; real game FENs `mate-1`, `fork-1`, `pin-1`, `double-1`, `defense-2`, with legal moves, visible answers and optional on-page interaction | Learn, How to Play, Play |
| `/parents/` | Assess suitability; chess for kids; free chess learning game | CHEZZIES for Parents — Free Chess Through Play; free adventure and computer opponents; They come to play. They discover chess. | FAQ on gameplay, cost, account saves and privacy | Learn, Online, Play |
| `/play/` | Start playing; play chess for kids; free online chess game | Play CHEZZIES — Free Online Chess Game for Kids; free browser adventure; Play CHEZZIES | The real game world, challenges and Arena, rendered by the game app | Guides in no-JS fallback; game navigation |

The five puzzle positions and solution moves come from `src/world/challenges/prepared.json` and are validated with `chess.js` during generation and tests. The page prints each position, question and answer in HTML, so it remains useful when JavaScript is disabled. Click-to-move is progressive enhancement. The game has no stable deep link to an individual challenge; the CTA opens the world map and names the corresponding fortress.

The map and challenge screenshots were captured from the current game, then optimized as WebP. The piece illustrations are optimized derivatives of existing product assets. The marketing bundle is separate from the game bundle. Existing Google Analytics 4 (consent-gated) and Vercel Analytics remain in place; the new puzzle interaction uses existing `puzzle_start` and `puzzle_complete` event names and sends no account details or board state. Do not interpret page loads or interaction events as proof of search ranking.

## Verification and remaining work

- Run `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` on the branch. Check Preview at 375, 390, 768, and 1440 px; inspect keyboard operation, readability, Start Adventure, no horizontal overflow, and unchanged game sign-in/progress routes.
- After deployment, inspect the eight Preview URLs directly and after refresh. Check that Preview robots/headers actually block indexing. Production should retain indexability when this branch is promoted deliberately.
- In Search Console, inspect all eight canonical URLs, review Google-selected canonical and indexing reason, retry the historical `/play/home` URL, and resubmit `https://chezzies.app/sitemap.xml` if its last fetch failed. Request indexing only after the production content is deployed. Search Console is the source for actual Google indexing, not this HTTP audit.
- Compare non-brand impressions, clicks, landing pages, and search terms over time in Search Console. GA4 and Vercel Analytics report visits and actions, not indexing. Review outbound publication traffic using existing referrer/page-view reporting; do not add duplicate analytics tags.
- Review the informational pages with a child/parent usability session and refine any confusing instructions. No organic position or AI citation is guaranteed.
