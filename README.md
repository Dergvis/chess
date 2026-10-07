# CHEZZIES international

A free chess adventure for kids, migrated from the actual September v18 CHEZZIES production source. This replaces the obsolete April game previously in this repository.

- Marketing: / and six focused, static HTML landing pages.
- Game: /play/ with the existing world, engine, heroes, progression and challenges.
- Product: English, free access; no payment UI or paid limits. Gameplay progression remains.
- Accounts: separate international database and API service, with the existing account/save logic.

See [source verification](docs/PRODUCTION-SOURCE-VERIFICATION.md), [migration report](docs/IMPLEMENTATION-REPORT.md) and [deployment instructions](docs/DEPLOYMENT.md).

## Development

Node 22.12+ for frontend; Node 24 for backend.

`npm ci`
`npm run build`
`npm run preview`
`npm run typecheck`
`npm run lint`
`npm test`

Preview runs at http://127.0.0.1:4173. Backend setup is documented separately.

Keep work on international-site. Do not merge to main until the owner approves.
