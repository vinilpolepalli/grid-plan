# Grid Plan v2

Independent demo built by Vinil Polepalli. Illustrative planning math from visible assumptions; not engineering advice. Not affiliated with or endorsed by Marengo.

A persisted scenario sandbox for a fictional data-center campus. Every number is derived from visible, editable assumptions by a pure, deterministic, server-side model; scenarios are saved and compared side by side.

## Run
```
npm install
npm run build && npm start      # http://localhost:3000
npm run dev                     # development
npm test                        # unit tests (model, validation, store)
```
- Storage: SQLite file `gridplan.db` (override with `GRIDPLAN_DB`). Set `DATABASE_URL` to use Postgres.
- Set `COOKIE_SECURE=1` when serving over HTTPS.
- No API keys, paid services, external requests, or randomness in the model.

## Pages
- `/` Sandbox: inputs left, MODELED outputs right (each with caveat and expandable formula), sensitivity matrix, SVG schematic.
- `/compare` pick 2-4 saved scenarios; server-computed deltas against the first.
- `/assumptions` edit every constant; saving creates a new version.

See IMPLEMENTATION.md for the data model, endpoints and verification results.
