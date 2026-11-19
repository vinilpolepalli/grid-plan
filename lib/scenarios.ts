import type { Store, ScenarioRow } from './db/store';
import { compute, formulas } from './model';
import { HttpError } from './validate';

/** Recomputes from the exact assumption version that saved the scenario (pure, so identical to save time). */
export async function present(store: Store, owner: string, s: ScenarioRow) {
  const set = await store.getSetById(owner, s.assumptionSetId);
  if (!set) throw new HttpError(500, 'assumption version missing');
  return {
    id: s.id, name: s.name, createdAt: s.createdAt, inputs: s.inputs,
    assumptionVersion: set.version, constants: set.constants,
    outputs: compute(s.inputs, set.constants), formulas: formulas(s.inputs, set.constants),
  };
}
