# Grid Plan — SPEC

Independent demo inspired by the problem space of Marengo (YC S26), AI-assisted data-center design. Not affiliated. A planning sandbox for a fictional campus, "Demo Campus".

## Honesty requirements
- Header badge: "Modeled demo - sample assumptions".
- Copy states all numbers are illustrative planning math from visible assumptions, not engineering advice.
- Every output number has the caveat line: "modeled from the stated assumptions, not an engineering estimate."
- Every output is labeled MODELED / ILLUSTRATIVE.
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Marengo."
- No runtime external calls (no remote fonts, analytics, fetches).

## Inputs
| Input | Control | Range / options | Default |
|---|---|---|---|
| IT load target | slider | 10–200 MW, step 1 | 60 |
| Redundancy tier | segmented | N, N+1, 2N | N+1 |
| Cooling approach | segmented | Air, Direct-to-chip liquid, Immersion | Direct-to-chip liquid |
| PUE assumption | slider | 1.10–1.60, step 0.01 | 1.30 |

## Assumption constants (all shown in the Assumptions panel)
- Rack density: air 40 kW, liquid 120 kW, immersion 250 kW (from brief).
- Whitespace per rack incl. aisles/clearance (ILLUSTRATIVE, chosen by this demo): air 4.0 m², liquid 3.5 m², immersion 3.0 m². 1 m² = 10.764 ft².
- Tier multiplier on utility feed (ILLUSTRATIVE): N = 1.00, N+1 = 1.25, 2N = 2.00.
- Power factor for MVA conversion: 0.95.

## Formulas
- Total facility power (MW) = IT load × PUE
- Rack count = ceil(IT load × 1000 / kW-per-rack)
- Whitespace (m²) = rack count × m²-per-rack (also shown in ft²)
- Utility feed (MW) = total facility power × tier multiplier; MVA = MW / 0.95

## Schematic (SVG, "not to scale")
Rows of rack blocks, one block = a fixed number of racks (scales so block count stays drawable, with the "1 block = N racks" legend), a cooling plant, and a substation. Updates with rack count and cooling approach. Labeled "Schematic only — not to scale".

## UI
Dark, sleek; primary accent blue #3b82f6 family (no indigo/violet/cyan). Desktop-first two-column; single column and readable at 390px.

## Tech
Next.js (App Router) static export (`output: 'export'`), TypeScript, plain CSS. `npm run build` must pass. No git commit, no deploy.

## Slices
1. Scaffold, inputs, computed outputs, assumptions panel, schematic, dark blue UI (this slice).
2. Schematic refined (desktop-wide and phone-tall SVG variants, "SCHEMATIC - NOT TO SCALE" label), caveat under every number, and a PUE sensitivity readout (facility power at PUE 1.1-1.6 for current inputs, labeled MODELED / ILLUSTRATIVE). Done.
3+. TBD.
