# International migration audit

## Baselines
- Target: Dergvis/chess, main 6230605d26cb8bac40efd524c3c76ecb6ed851a8. Branch: international-site. Production/main must not be changed.
- Old repository: April chess-gosha React/Vite SPA, legacy PWA, tracked node_modules and dist, no Vercel route configuration. 11,477 tracked files.
- Current source: ../world-dev, September world and mobile v18. Source inspection confirms five tactic territories, hero selection/growth, four fortress stages and guardians, adaptive challenges, AI opponents, training ground, progress and parent summary. This is the migration source, not the old README.
- Original artwork: world-art/map.png, fortress courtyard, original toy heroes, piece skins and animation media.
- Current access.ts gates content by subscription; App.tsx calls billing/auth APIs. International entry retains the current App account/onboarding shell with payment UI and gates disabled.
- Existing guest progress is browser-local. International account synchronization needs its own backend; do not claim cross-device accounts until implemented.
- No approved homepage mockup supplied yet. Visual comparison is pending. Ages 5–9 unconfirmed; omit numerical ages.

## Architecture
- Vite multi-page output: marketing HTML is generated at build time, with lightweight enhancement for a real chess.js challenge.
- /play/index.html loads the verified current App and WorldApp, existing engine, account flow, challenges and progression under the /play/ basename.
- src/product.ts controls market, payments and account availability. All international content is accessible without billing; normal gameplay progression stays intact.
- public contains original media. Optimize marketing derivatives; keep original pieces unchanged.
- Seven indexable marketing pages plus /play/, canonical URLs, visible factual copy, entity JSON-LD, sitemap/robots, custom 404. No catch-all rewrite of unknown URLs.
- Vercel builds the site from source. Preview stays noindex. IndexNow submission is production-only and opt-in after actual publication.
- Analytics uses a restricted event/property allowlist. No payment events, names, emails, full referrers or arbitrary URL parameters.

## Replacement
Remove old src/public implementation, legacy PWA configuration, committed dist/node_modules and obsolete April fix reports. Preserve their history in main. Import current game source/assets, keeping the Russian working directory untouched. The supplied backend source is included with separate international storage and blocked billing routes. The live Russian backend is untouched.

## Evidence
- Current source: src/world/{WorldApp,catalog,access,journey,regions,events}.ts(x); src/world/challenges; src/world/range.
- Source release notes: ../production-audit/MOBILE-V18-REPORT.md.
- Search guidance: https://developers.google.com/search/docs/appearance/ai-features (no special AI schema required; indexable helpful content and consistent structured data).
- Deployment: https://vercel.com/docs/project-configuration
- URL notification protocol: https://www.indexnow.org/documentation

