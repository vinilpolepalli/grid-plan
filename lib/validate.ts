import { COOLINGS, TIERS, type Constants, type Cooling, type Inputs, type Tier } from './model';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (m: string) => new HttpError(400, m);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown, name: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw bad(`${name} must be a number`);
  if (v < min || v > max) throw bad(`${name} must be between ${min} and ${max}`);
  return v;
}
function exactKeys(o: Record<string, unknown>, keys: readonly string[], name: string) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) throw bad(`${name}: unknown field ${k}`);
  for (const k of keys) if (!(k in o)) throw bad(`${name}: missing ${k}`);
}

export const LIMITS = {
  itMw: [1, 1000], pue: [1.0, 2.5], kwPerRack: [1, 1000], m2PerRack: [0.5, 50],
  tierMult: [1, 4], hoursPerYear: [1, 8784], ft2PerM2: [10, 11.5], powerFactor: [0.5, 1], tonsPerMw: [200, 400],
} as const;

export function parseInputs(v: unknown): Inputs {
  if (!isObj(v)) throw bad('inputs must be an object');
  exactKeys(v, ['itMw', 'tier', 'cooling', 'pue'], 'inputs');
  if (!TIERS.includes(v.tier as Tier)) throw bad('tier must be N, N+1 or 2N');
  if (!COOLINGS.includes(v.cooling as Cooling)) throw bad('cooling must be air, liquid or immersion');
  return {
    itMw: num(v.itMw, 'itMw', ...LIMITS.itMw),
    pue: num(v.pue, 'pue', ...LIMITS.pue),
    tier: v.tier as Tier,
    cooling: v.cooling as Cooling,
  };
}

function rec<K extends string>(v: unknown, keys: readonly K[], name: string, lim: readonly [number, number]): Record<K, number> {
  if (!isObj(v)) throw bad(`${name} must be an object`);
  exactKeys(v, keys, name);
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = num(v[k], `${name}.${k}`, lim[0], lim[1]);
  return out;
}

export function parseConstants(v: unknown): Constants {
  if (!isObj(v)) throw bad('constants must be an object');
  exactKeys(v, ['kwPerRack', 'm2PerRack', 'tierMult', 'hoursPerYear', 'ft2PerM2', 'powerFactor', 'tonsPerMw'], 'constants');
  return {
    kwPerRack: rec(v.kwPerRack, COOLINGS, 'kwPerRack', LIMITS.kwPerRack),
    m2PerRack: rec(v.m2PerRack, COOLINGS, 'm2PerRack', LIMITS.m2PerRack),
    tierMult: rec(v.tierMult, TIERS, 'tierMult', LIMITS.tierMult),
    hoursPerYear: num(v.hoursPerYear, 'hoursPerYear', ...LIMITS.hoursPerYear),
    ft2PerM2: num(v.ft2PerM2, 'ft2PerM2', ...LIMITS.ft2PerM2),
    powerFactor: num(v.powerFactor, 'powerFactor', ...LIMITS.powerFactor),
    tonsPerMw: num(v.tonsPerMw, 'tonsPerMw', ...LIMITS.tonsPerMw),
  };
}

export function parseName(v: unknown): string {
  if (typeof v !== 'string') throw bad('name must be a string');
  const s = v.trim();
  if (s.length < 1 || s.length > 80) throw bad('name must be 1-80 characters');
  return s;
}

export function parseIds(v: unknown): string[] {
  if (!Array.isArray(v) || v.length < 2 || v.length > 4) throw bad('ids must be an array of 2-4 scenario ids');
  if (!v.every((x) => typeof x === 'string' && x.length > 0 && x.length < 64)) throw bad('ids must be strings');
  if (new Set(v).size !== v.length) throw bad('ids must be distinct');
  return v as string[];
}
