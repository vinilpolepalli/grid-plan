import { route } from '@/lib/api';
import { present } from '@/lib/scenarios';
import { parseInputs, parseName } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  const rows = await store.listScenarios(owner);
  return { scenarios: await Promise.all(rows.map((r) => present(store, owner, r))) };
});

export const POST = route(true, async ({ owner, store, body }) => {
  const b = (body() ?? {}) as { name?: unknown; inputs?: unknown };
  const name = parseName(b.name);
  const inputs = parseInputs(b.inputs);
  const set = await store.currentSet(owner);
  const row = await store.createScenario(owner, name, inputs, set.id);
  return { scenario: await present(store, owner, row) };
});
