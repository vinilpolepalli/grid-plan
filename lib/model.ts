// Pure deterministic planning model. No I/O, no randomness: same inputs + constants => same outputs.
export type Tier = 'N' | 'N+1' | '2N';
export type Cooling = 'air' | 'liquid' | 'immersion';

export const TIERS: Tier[] = ['N', 'N+1', '2N'];
export const COOLINGS: Cooling[] = ['air', 'liquid', 'immersion'];
export const COOLING_LABEL: Record<Cooling, string> = {
  air: 'Air',
  liquid: 'Direct-to-chip liquid',
  immersion: 'Immersion',
};

export interface Inputs { itMw: number; tier: Tier; cooling: Cooling; pue: number }

export interface Constants {
  kwPerRack: Record<Cooling, number>;
  m2PerRack: Record<Cooling, number>;
  tierMult: Record<Tier, number>;
  hoursPerYear: number;
  ft2PerM2: number;
  powerFactor: number;
  tonsPerMw: number;
}

export const DEFAULT_CONSTANTS: Constants = {
  kwPerRack: { air: 40, liquid: 120, immersion: 250 },
  m2PerRack: { air: 4.0, liquid: 3.5, immersion: 3.0 },
  tierMult: { N: 1.0, 'N+1': 1.25, '2N': 2.0 },
  hoursPerYear: 8760,
  ft2PerM2: 10.764,
  powerFactor: 0.95,
  tonsPerMw: 284.345,
};

export interface Outputs {
  facilityMw: number;
  racks: number;
  whitespaceM2: number;
  whitespaceFt2: number;
  feedMw: number;
  feedMva: number;
  energyGwh: number;
  coolingMwt: number;
  coolingTons: number;
}

export type OutputKey = keyof Outputs;

export const OUTPUT_META: Record<OutputKey, { label: string; unit: string; digits: number }> = {
  facilityMw: { label: 'Total facility power', unit: 'MW', digits: 2 },
  racks: { label: 'Rack count', unit: 'racks', digits: 0 },
  whitespaceM2: { label: 'Whitespace', unit: 'm²', digits: 0 },
  whitespaceFt2: { label: 'Whitespace', unit: 'ft²', digits: 0 },
  feedMw: { label: 'Utility feed', unit: 'MW', digits: 2 },
  feedMva: { label: 'Utility feed', unit: 'MVA', digits: 2 },
  energyGwh: { label: 'Annual energy', unit: 'GWh/yr', digits: 1 },
  coolingMwt: { label: 'Installed cooling capacity', unit: 'MW thermal', digits: 2 },
  coolingTons: { label: 'Installed cooling capacity', unit: 'refrigeration tons', digits: 0 },
};
export const OUTPUT_KEYS = Object.keys(OUTPUT_META) as OutputKey[];

export function compute(i: Inputs, c: Constants): Outputs {
  const facilityMw = i.itMw * i.pue;
  const racks = Math.ceil((i.itMw * 1000) / c.kwPerRack[i.cooling]);
  const whitespaceM2 = racks * c.m2PerRack[i.cooling];
  const whitespaceFt2 = whitespaceM2 * c.ft2PerM2;
  const feedMw = facilityMw * c.tierMult[i.tier];
  const feedMva = feedMw / c.powerFactor;
  const energyGwh = (facilityMw * c.hoursPerYear) / 1000;
  const coolingMwt = facilityMw * c.tierMult[i.tier];
  const coolingTons = coolingMwt * c.tonsPerMw;
  return { facilityMw, racks, whitespaceM2, whitespaceFt2, feedMw, feedMva, energyGwh, coolingMwt, coolingTons };
}

const f = (n: number) => String(Math.round(n * 1e6) / 1e6);

/** The exact formulas with this run's constants substituted in. */
export function formulas(i: Inputs, c: Constants): Record<OutputKey, string> {
  const o = compute(i, c);
  const kw = c.kwPerRack[i.cooling], m2 = c.m2PerRack[i.cooling], tm = c.tierMult[i.tier];
  return {
    facilityMw: `IT load x PUE = ${f(i.itMw)} x ${f(i.pue)} = ${f(o.facilityMw)} MW`,
    racks: `ceil(IT load x 1000 / kW per rack) = ceil(${f(i.itMw)} x 1000 / ${f(kw)}) = ${o.racks}`,
    whitespaceM2: `racks x m² per rack = ${o.racks} x ${f(m2)} = ${f(o.whitespaceM2)} m²`,
    whitespaceFt2: `whitespace m² x ft² per m² = ${f(o.whitespaceM2)} x ${f(c.ft2PerM2)} = ${f(o.whitespaceFt2)} ft²`,
    feedMw: `facility power x tier multiplier (${i.tier}) = ${f(o.facilityMw)} x ${f(tm)} = ${f(o.feedMw)} MW`,
    feedMva: `feed MW / power factor = ${f(o.feedMw)} / ${f(c.powerFactor)} = ${f(o.feedMva)} MVA`,
    energyGwh: `facility power x hours per year / 1000 = ${f(o.facilityMw)} x ${f(c.hoursPerYear)} / 1000 = ${f(o.energyGwh)} GWh/yr (flat full load)`,
    coolingMwt: `facility power (all of it ends as heat) x tier multiplier (${i.tier}) = ${f(o.facilityMw)} x ${f(tm)} = ${f(o.coolingMwt)} MW thermal`,
    coolingTons: `cooling MW thermal x tons per MW = ${f(o.coolingMwt)} x ${f(c.tonsPerMw)} = ${f(o.coolingTons)} tons`,
  };
}

export interface SensitivityCell { tier: Tier; cooling: Cooling; outputs: Outputs }

/** Same model across every tier x cooling combination at the current IT load and PUE. */
export function sensitivity(i: Inputs, c: Constants): SensitivityCell[] {
  const cells: SensitivityCell[] = [];
  for (const tier of TIERS) for (const cooling of COOLINGS) {
    cells.push({ tier, cooling, outputs: compute({ ...i, tier, cooling }, c) });
  }
  return cells;
}

export interface Delta { abs: number; pct: number | null }
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function deltas(base: Outputs, other: Outputs): Record<OutputKey, Delta> {
  const out = {} as Record<OutputKey, Delta>;
  for (const k of OUTPUT_KEYS) {
    const abs = r6(other[k] - base[k]);
    out[k] = { abs, pct: base[k] === 0 ? null : r6(((other[k] - base[k]) / base[k]) * 100) };
  }
  return out;
}
