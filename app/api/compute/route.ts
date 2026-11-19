import { route } from '@/lib/api';
import { compute, formulas, sensitivity } from '@/lib/model';
import { parseInputs } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = route(false, async ({ owner, store, body }) => {
  const inputs = parseInputs((body() as { inputs?: unknown } | undefined)?.inputs);
  const set = await store.currentSet(owner);
  return {
    assumptionVersion: set.version,
    constants: set.constants,
    outputs: compute(inputs, set.constants),
    formulas: formulas(inputs, set.constants),
    sensitivity: sensitivity(inputs, set.constants),
  };
});
