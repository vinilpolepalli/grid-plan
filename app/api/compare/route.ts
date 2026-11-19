import { route } from '@/lib/api';
import { deltas } from '@/lib/model';
import { present } from '@/lib/scenarios';
import { HttpError, parseIds } from '@/lib/validate';

export const dynamic = 'force-dynamic';

/** Side-by-side of 2-4 scenarios; deltas are computed here, relative to the first id. */
export const POST = route(false, async ({ owner, store, body }) => {
  const ids = parseIds((body() as { ids?: unknown } | undefined)?.ids);
  const items = [];
  for (const id of ids) {
    const s = await store.getScenario(owner, id);
    if (!s) throw new HttpError(404, 'scenario not found');
    items.push(await present(store, owner, s));
  }
  const base = items[0];
  return {
    baseId: base.id,
    scenarios: items,
    deltas: Object.fromEntries(items.slice(1).map((s) => [s.id, deltas(base.outputs, s.outputs)])),
  };
});
