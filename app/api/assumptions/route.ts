import { route } from '@/lib/api';
import { parseConstants } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  const current = await store.currentSet(owner);
  return { current, history: await store.listSets(owner) };
});

/** Saves a new immutable version; old scenarios keep pointing at the version that computed them. */
export const POST = route(true, async ({ owner, store, body }) => {
  const b = body() as { constants?: unknown } | undefined;
  const constants = parseConstants(b?.constants);
  await store.currentSet(owner);
  return { current: await store.createSet(owner, constants) };
});
