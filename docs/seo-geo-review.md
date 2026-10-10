# CHEZZIES SEO/GEO review

Canonical host: `https://chezzies.app`. The HTML, JSON-LD, Open Graph URLs, and sitemap already use this host. On 11 October 2026 the live Vercel domain settings still show `chezzies.app` redirecting with 307 to `www.chezzies.app`, while `www.chezzies.app` serves Production. That setting must be reversed when this change is approved for production: make `chezzies.app` the Production domain and redirect `www.chezzies.app` permanently to it. Check all four HTTP/HTTPS host variants afterward; Vercel's automatic HTTP-to-HTTPS redirect may affect the hop count and needs a live test.

`/play/home/` is an internal React game route. A hard refresh currently serves the game and preserves this route. Redirecting it would reset that entry state, so the review change gives internal game routes an `X-Robots-Tag: noindex, follow` response while their canonical link remains `/play/`. They are absent from the sitemap and not linked from marketing pages. Legacy payment URLs now redirect directly to `/play/`, avoiding an extra `/play/home/` hop.

The five topic pages now have concise titles, H1s, and direct introductory answers for English search intents. Existing question sections, links, Organization/WebSite/SoftwareApplication/BreadcrumbList JSON-LD, sitemap, and robots.txt were checked and retained. No unsupported ratings, age range, or app-store availability claims were added.

After approval: deploy the review branch to Production, reverse the two Vercel domain assignments, verify direct routes and refreshes, then use Search Console URL Inspection to request validation for `/play/home` and submit the canonical sitemap. Search Console status and non-brand impressions can take time to change; code changes alone do not guarantee ranking.
