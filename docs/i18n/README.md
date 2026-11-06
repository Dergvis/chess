# Spanish version (/es/)

- One source, two game builds. `npm run build` runs `scripts/generate-site.mjs` (English + Spanish HTML), then `vite build` (English, `/play/`) and `vite build --config vite.es.config.mjs` (Spanish, `/es/play/`).
- `scripts/i18n/vite-locale.mjs` rewrites English string literals in `src/` (TS/TSX/JSON/CSS `content:`) using `docs/i18n/es.json` (English → Spanish). Object keys, imports and TS literal types are never touched. Template literals can be translated whole with `{}` placeholders, e.g. `"Another {} {}": "{} {} más"`.
- Language: neutral Latin American Spanish, «tú». Chess terms: rey, reina, torre, alfil, caballo, peón; jaque, jaque mate, ahogado, horquilla (fork), clavada (pin), ataque doble. Spanish notation on the site: R, D, T, A, C.
- Hero and character names (Laserhorse, Ladiator, Officer Cannon, King Nexus…) stay untranslated: some are used as identifiers.
- New English UI text: run `node scripts/i18n/extract.cjs` (writes `docs/i18n/strings.json`), add missing entries to `es.json`, rebuild, and check the screen at `/es/play/`. A missing entry simply stays English.
- Site pages: `scripts/content-es.mjs`, `scripts/homepage-es.mjs`, Spanish puzzle texts in `scripts/puzzles.mjs` (`puzzleSetsEs`). Every page has hreflang en/es/x-default; the sitemap lists both languages.
- Known limits: account e-mails (password reset) are still English; gameplay screenshots on the Spanish pages show the English UI.
