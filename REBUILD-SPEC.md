# Grid Plan v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to Marengo (marengox.com, YC S26): an AI-native engineering firm for accelerated data-center design - deterministic, physics-informed tools that parallelize concept generation and run comparisons. Grid Plan demonstrates the deterministic-modeling core: a persisted scenario sandbox where every number derives from visible, editable assumptions, and scenarios can be saved and compared side by side.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness (pure functions).

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export').
- Drizzle ORM: SQLite (gridplan.db) dev; Postgres via DATABASE_URL prod.
- The deterministic model (facility power, rack count, whitespace, utility feed, energy, cooling capacity) is the pure tested core, server-side, unit-tested (npm test). Every constant lives in an editable assumption set.

## Product workflow (fitted to THIS product)
1. Home = the sandbox: input panel (IT load MW, redundancy tier, cooling approach, PUE) driving computed outputs; first action above the fold on mobile.
2. Every output labeled MODELED with its one-line caveat "modeled from the stated assumptions, not an engineering estimate" and an expandable formula showing the exact constants used.
3. Assumptions panel: every constant visible AND editable per owner (kW/rack per cooling approach, tier multipliers, sqm per rack, hours/year); saved as versions; each scenario records which assumption version computed it.
4. Save scenario (named); scenarios list; COMPARISON VIEW (the differentiator, maps Marengo's parallel concept generation at honest demo scale): pick 2-4 saved scenarios, see inputs + outputs side by side with deltas computed server-side.
5. Sensitivity strip: for the current inputs, the same model run across all 3 cooling approaches and all 3 tiers, computed server-side, shown as a small matrix.
6. SVG schematic of the campus block layout updating with rack count, labeled "schematic, not to scale".

## Truthfulness bar
- MODELED / ILLUSTRATIVE labels on every number; copy states this is planning math from visible assumptions, not engineering advice, no real site data.
- Footer: "Independent demo built by Vinil Polepalli. Illustrative planning math from visible assumptions; not engineering advice. Not affiliated with or endorsed by Marengo."

## Abuse and isolation controls
- Owner cookie (gp_uid, httpOnly); scenarios/assumptions owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner, 413 at 20KB; inputs validated (MW 1-1000, PUE 1.0-2.5, constants positive within sane bounds).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono for figures where it aids scanning.
- Brand accent: signal red #b91c1c (hover #991b1b). Deliberate: high-voltage/engineering-safety read for a power-infrastructure tool, a true red distinct from the sibling wine-crimson #9f1239 and from every other sibling accent; not the indigo/violet band. Comment the rationale in tailwind.config.ts.
- Pills only for status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards, no amber-50 fills.
- Layout fitted to an engineering worksheet (inputs left, outputs right, schematic below), not a clone of sibling demos. Mobile: stacked.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server; hand-check one scenario's full output set against the formulas by independent recomputation; edit an assumption constant and verify outputs change accordingly and old saved scenarios still show the version that computed them; save 3 scenarios and verify the comparison deltas; persistence across restart; owner isolation; rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: gp2-sandbox.png, gp2-compare.png, gp2-assumptions.png, gp2-mobile.png (390px) from the RUNNING app.
