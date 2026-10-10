# CHEZZIES SEO/GEO review

Canonical host: `https://chezzies.app`. The HTML, JSON-LD, Open Graph URLs, and sitemap use this host. On 11 October 2026 Vercel was changed so `chezzies.app` serves Production and `www.chezzies.app` returns 308 to the apex. Live checks show HTTPS `www` reaches the apex in one hop and HTTP apex reaches HTTPS apex in one hop. HTTP `www` takes two hops because Vercel first upgrades it to HTTPS and then applies the domain redirect; that platform-level HTTP upgrade cannot be overridden by the project's route configuration.

`/play/home/` is an internal React game route. A hard refresh currently serves the game and preserves this route. Redirecting it would reset that entry state, so the review change gives internal game routes an `X-Robots-Tag: noindex, follow` response while their canonical link remains `/play/`. They are absent from the sitemap and not linked from marketing pages. Legacy payment URLs now redirect directly to `/play/`, avoiding an extra `/play/home/` hop.

The five topic pages now have concise titles, H1s, and direct introductory answers for English search intents. Existing question sections, links, Organization/WebSite/SoftwareApplication/BreadcrumbList JSON-LD, sitemap, and robots.txt were checked and retained. No unsupported ratings, age range, or app-store availability claims were added.

The review branch was promoted to Production after approval. A live route check found that Vercel applies `trailingSlash` normalization before its redirect rules. Legacy payment URLs and `/reset-password/` need redirect sources ending in `/`; this follow-up correction is covered by the route test. Search Console status and non-brand impressions can take time to change; code changes alone do not guarantee ranking.
