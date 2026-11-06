# Production source verification — 2026-10-03

Source access is resolved. The current frontend was verified against production, and the owner supplied the backend source. Online international service provisioning remains pending.

## Confirmed frontend source

`C:/Users/Max/Documents/chezzies ru/world-dev` builds the current CHEZZIES v18 frontend. A fresh, unmodified build was created in `../international-source-verification`. All five output files are byte-identical to the saved v18 deployment package.

Direct HTTPS requests to https://chezzies.ru/ confirmed byte-identical production HTML, main JavaScript and CSS:

| File | SHA-256 |
| --- | --- |
| index.html | 587babf7c7fb4e49096bb53c5fc81587fe50ee3e49aca25ce64573be124f8ea4 |
| assets/index-DaP3Vbfb.js | 6930032c4617d126de158a212803bacbea6b8b6ed0fe77b8d62ba30ee469d063 |
| assets/index-0g5aZxYm.css | dee8e8dd7c211994c699790840353f49da6608960a34866fe3a16a94f5e04333 |

This is reproducible source verification, not a reconstruction from screenshots. The obsolete GitHub source is not used as the migration base.

## Source access resolved

The owner supplied C:/Users/Max/Desktop/chezzies-api on 2026-10-03 as the server source. Its server.js SHA-256 is 9290e80d987f0d5055a6a3b8ac03236f28f8c125a7295fe112c8807c5a21f2fa; world-routes.cjs is f6dfbe0804100a02714a4cea6abda8d7c826b20a334178d0d74059a4657a54b0. Both exactly match the audited v18 deployment source. The earlier source-access stop is resolved. The owner selected a separate international account database. The original App.tsx account flow has been restored in the migration; accounts are not disabled. Live service provisioning remains pending.

