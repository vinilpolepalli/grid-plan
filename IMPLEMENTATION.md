# Implementation notes

## Stack
Next.js 16 App Router (server runtime), TypeScript, Tailwind 3, Drizzle ORM (SQLite via better-sqlite3 for dev), vitest.

## Model (`lib/model.ts`, pure)
Constants (`Constants`): kW/rack and m²/rack per cooling approach, tier multipliers (N, N+1, 2N), hours/year, ft²/m², power factor, refrigeration tons per MW thermal. Defaults are `DEFAULT_CONSTANTS`; all are editable per owner.

- facility MW = IT MW x PUE
- racks = ceil(IT MW x 1000 / kW per rack)
- whitespace m² = racks x m² per rack; ft² = m² x ft²/m²
- feed MW = facility MW x tier multiplier; MVA = feed MW / power factor
- annual energy GWh = facility MW x hours/year / 1000 (flat full load)
- installed cooling MWt = facility MW x tier multiplier; tons = MWt x tons per MW

Every output has a formula string with the exact constants substituted (`formulas()`), shown in the UI.
Sensitivity = same model over 3 tiers x 3 cooling approaches. Deltas = other - base, with percent.

## Data model
- `assumption_sets(id, owner_id, version, constants JSON, created_at)`, unique(owner, version). Immutable rows; v1 = defaults, created lazily.
- `scenarios(id, owner_id, name, inputs JSON, assumption_set_id, created_at)`. Outputs are recomputed (pure) from the referenced set, so a scenario always shows the version that computed it.
- `write_counts(owner_id, bucket(hour), count)` for the rate limit.

## Endpoints (all owner-scoped via `gp_uid` httpOnly cookie)
| Method | Path | Purpose |
|---|---|---|
| POST | /api/compute | `{inputs}` -> outputs, formulas, sensitivity, current constants/version |
| GET | /api/assumptions | current set + version history |
| POST | /api/assumptions | `{constants}` -> new version (write) |
| GET/POST | /api/scenarios | list / save `{name, inputs}` against current version (write) |
| GET/DELETE | /api/scenarios/:id | fetch / delete; other owner's id -> 404 |
| POST | /api/compare | `{ids: 2-4}` -> scenarios + server-side deltas vs first |

Controls: writes limited to 120/hour/owner (429), bodies over 20KB -> 413, cross-origin writes refused (403), unknown fields rejected. Limits: MW 1-1000, PUE 1.0-2.5, kW/rack 1-1000, m²/rack 0.5-50, tier multiplier 1-4, hours 1-8784, ft²/m² 10-11.5, power factor 0.5-1, tons/MW 200-400. Cross-owner access returns 404 (not 403) so ids do not leak existence.

## Verification (run against the built app, `npm start`)
- `npm run build` and `npm test` (9 tests) pass.
- Hand check, 60 MW / N+1 / liquid / PUE 1.3 on default constants: facility 78 MW; racks ceil(60000/120)=500; whitespace 500x3.5=1750 m² (18,837 ft²); feed 97.5 MW, 102.63 MVA; energy 78x8760/1000=683.28 GWh; cooling 97.5 MWt (27,724 tons). The API returned exactly these.
- Edited liquid kW/rack 120->100 and hours 8760->8000 (saved as v2): same inputs gave 600 racks, 2,100 m², 624 GWh. The scenario saved earlier still reports v1 and 500 racks / 683.28 GWh.
- Three scenarios compared (Base v1, 2N air, Big immersion): e.g. 2N air at 60 MW, PUE 1.4: facility 84 (+6), feed 168 (+70.5), racks 1,500 (+1,000), matching hand calculation.
- Persistence: scenarios and assumption versions survived a server restart.
- Isolation: a second owner got 404 on GET/DELETE of the first owner's scenario and on compare.
- Limits: 21KB body -> 413; MW 1001 -> 400; 130 rapid writes -> 119 x 200 then 429 (one write was already used by a DELETE in that window).
- Scan: `python3 ~/unslop/devibe_scan.py .` reports 0 high; 2 medium hits are the status-chip pills allowed by the spec. No unslop-ignore comments.
- Screenshots (from the running app): /tmp/gp2-sandbox.png, gp2-compare.png, gp2-assumptions.png, gp2-mobile.png (390px, no horizontal overflow).

## Caveats
- The Postgres store (`lib/db/pg.ts`) mirrors the SQLite one but was not run against a live Postgres here.
- Sensitivity matrix: feed depends only on tier and racks only on cooling by the model's design, so some metrics are constant along one axis.
