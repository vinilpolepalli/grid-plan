import { describe, expect, it } from 'vitest';
import { compute, deltas, DEFAULT_CONSTANTS as C, sensitivity } from '../lib/model';
import { HttpError, parseConstants, parseIds, parseInputs } from '../lib/validate';
import { createSqliteStore } from '../lib/db/sqlite';

const base = { itMw: 60, tier: 'N+1', cooling: 'liquid', pue: 1.3 } as const;

describe('model', () => {
  it('matches hand calculation', () => {
    const o = compute(base, C);
    expect(o.facilityMw).toBeCloseTo(78, 9);
    expect(o.racks).toBe(500);
    expect(o.whitespaceM2).toBe(1750);
    expect(o.whitespaceFt2).toBeCloseTo(18837, 6);
    expect(o.feedMw).toBeCloseTo(97.5, 9);
    expect(o.feedMva).toBeCloseTo(102.631579, 5);
    expect(o.energyGwh).toBeCloseTo(683.28, 6);
    expect(o.coolingTons).toBeCloseTo(97.5 * 284.345, 6);
  });
  it('rounds racks up', () => expect(compute({ ...base, itMw: 61 }, C).racks).toBe(509));
  it('is deterministic', () => expect(compute(base, C)).toEqual(compute(base, C)));
  it('covers 9 sensitivity cells', () => expect(sensitivity(base, C)).toHaveLength(9));
  it('computes deltas', () => {
    const d = deltas(compute(base, C), compute({ ...base, tier: '2N' }, C));
    expect(d.feedMw.abs).toBeCloseTo(58.5, 6);
    expect(d.feedMw.pct).toBeCloseTo(60, 6);
    expect(d.racks.abs).toBe(0);
  });
});

describe('validation', () => {
  it('accepts valid and rejects out of range', () => {
    expect(parseInputs(base)).toEqual(base);
    expect(() => parseInputs({ ...base, itMw: 0 })).toThrow(HttpError);
    expect(() => parseInputs({ ...base, itMw: 1001 })).toThrow(HttpError);
    expect(() => parseInputs({ ...base, pue: 0.9 })).toThrow(HttpError);
    expect(() => parseInputs({ ...base, pue: 2.6 })).toThrow(HttpError);
    expect(() => parseInputs({ ...base, tier: '3N' })).toThrow(HttpError);
    expect(() => parseInputs({ ...base, extra: 1 })).toThrow(HttpError);
  });
  it('validates constants', () => {
    expect(parseConstants(C)).toEqual(C);
    expect(() => parseConstants({ ...C, hoursPerYear: -1 })).toThrow(HttpError);
    expect(() => parseConstants({ ...C, kwPerRack: { ...C.kwPerRack, air: 0 } })).toThrow(HttpError);
    expect(() => parseConstants({ ...C, powerFactor: NaN })).toThrow(HttpError);
  });
  it('validates ids', () => {
    expect(() => parseIds(['a'])).toThrow(HttpError);
    expect(() => parseIds(['a', 'a'])).toThrow(HttpError);
    expect(() => parseIds(['a', 'b', 'c', 'd', 'e'])).toThrow(HttpError);
    expect(parseIds(['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('store', () => {
  it('versions assumptions, isolates owners, rate-limits', async () => {
    const s = await createSqliteStore(':memory:');
    const v1 = await s.currentSet('a');
    expect(v1.version).toBe(1);
    const v2 = await s.createSet('a', { ...C, hoursPerYear: 8000 });
    expect(v2.version).toBe(2);
    expect((await s.currentSet('b')).version).toBe(1);
    const sc = await s.createScenario('a', 'x', base, v1.id);
    expect(await s.getScenario('b', sc.id)).toBeNull();
    expect(await s.deleteScenario('b', sc.id)).toBe(false);
    expect((await s.getSetById('a', sc.assumptionSetId))!.version).toBe(1);
    for (let i = 0; i < 3; i++) expect(await s.allowWrite('a', 3, 0)).toBe(true);
    expect(await s.allowWrite('a', 3, 0)).toBe(false);
    expect(await s.allowWrite('b', 3, 0)).toBe(true);
  });
});
