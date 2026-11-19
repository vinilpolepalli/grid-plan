import { route } from '@/lib/api';
import { present } from '@/lib/scenarios';
import { HttpError } from '@/lib/validate';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, p: P) => {
  const { id } = await p.params;
  return route(false, async ({ owner, store }) => {
    const s = await store.getScenario(owner, id);
    if (!s) throw new HttpError(404, 'scenario not found');
    return { scenario: await present(store, owner, s) };
  })(req);
};

export const DELETE = async (req: NextRequest, p: P) => {
  const { id } = await p.params;
  return route(true, async ({ owner, store }) => {
    if (!(await store.deleteScenario(owner, id))) throw new HttpError(404, 'scenario not found');
    return { deleted: id };
  })(req);
};
