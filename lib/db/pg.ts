import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { DEFAULT_CONSTANTS } from '../model';
import type { AssumptionSet, ScenarioRow, Store } from './store';

// Postgres implementation for production (DATABASE_URL). Same tables and semantics as the SQLite store.
// It has not been exercised against a live Postgres in this repo's verification (see IMPLEMENTATION.md).
type SetRow = { id: string; version: number; constants: string; created_at: string };
type ScRow = { id: string; name: string; inputs: string; assumption_set_id: string; created_at: string };
const toSet = (r: SetRow): AssumptionSet => ({ id: r.id, version: r.version, constants: JSON.parse(r.constants), createdAt: r.created_at });
const toSc = (r: ScRow): ScenarioRow => ({ id: r.id, name: r.name, inputs: JSON.parse(r.inputs), assumptionSetId: r.assumption_set_id, createdAt: r.created_at });

export async function createPgStore(url: string): Promise<Store> {
  const pool = new Pool({ connectionString: url });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assumption_sets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL, constants TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(owner_id, version));
    CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, inputs TEXT NOT NULL, assumption_set_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS scenarios_owner ON scenarios(owner_id);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket BIGINT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);

  async function insertSet(owner: string, constants: unknown): Promise<AssumptionSet> {
    // Version assigned atomically; unique(owner_id, version) guards concurrent inserts.
    const r = await pool.query<SetRow>(
      `INSERT INTO assumption_sets (id, owner_id, version, constants, created_at)
       VALUES ($1, $2, COALESCE((SELECT MAX(version) FROM assumption_sets WHERE owner_id = $2), 0) + 1, $3, $4) RETURNING *`,
      [randomUUID(), owner, JSON.stringify(constants), new Date().toISOString()],
    );
    return toSet(r.rows[0]);
  }

  return {
    async currentSet(owner) {
      const r = await pool.query<SetRow>('SELECT * FROM assumption_sets WHERE owner_id=$1 ORDER BY version DESC LIMIT 1', [owner]);
      if (r.rows[0]) return toSet(r.rows[0]);
      try { return await insertSet(owner, DEFAULT_CONSTANTS); } catch {
        const again = await pool.query<SetRow>('SELECT * FROM assumption_sets WHERE owner_id=$1 ORDER BY version DESC LIMIT 1', [owner]);
        return toSet(again.rows[0]);
      }
    },
    async listSets(owner) {
      return (await pool.query<SetRow>('SELECT * FROM assumption_sets WHERE owner_id=$1 ORDER BY version DESC', [owner])).rows.map(toSet);
    },
    async getSetById(owner, id) {
      const r = await pool.query<SetRow>('SELECT * FROM assumption_sets WHERE owner_id=$1 AND id=$2', [owner, id]);
      return r.rows[0] ? toSet(r.rows[0]) : null;
    },
    createSet: insertSet,
    async listScenarios(owner) {
      return (await pool.query<ScRow>('SELECT * FROM scenarios WHERE owner_id=$1 ORDER BY created_at DESC', [owner])).rows.map(toSc);
    },
    async getScenario(owner, id) {
      const r = await pool.query<ScRow>('SELECT * FROM scenarios WHERE owner_id=$1 AND id=$2', [owner, id]);
      return r.rows[0] ? toSc(r.rows[0]) : null;
    },
    async createScenario(owner, name, inputs, setId) {
      const r = await pool.query<ScRow>(
        'INSERT INTO scenarios (id, owner_id, name, inputs, assumption_set_id, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [randomUUID(), owner, name, JSON.stringify(inputs), setId, new Date().toISOString()],
      );
      return toSc(r.rows[0]);
    },
    async deleteScenario(owner, id) {
      return ((await pool.query('DELETE FROM scenarios WHERE owner_id=$1 AND id=$2', [owner, id])).rowCount ?? 0) > 0;
    },
    async allowWrite(owner, limit, now = Date.now()) {
      const bucket = Math.floor(now / 3_600_000);
      const r = await pool.query(
        `INSERT INTO write_counts (owner_id, bucket, count) VALUES ($1,$2,1)
         ON CONFLICT (owner_id, bucket) DO UPDATE SET count = write_counts.count + 1 WHERE write_counts.count < $3 RETURNING count`,
        [owner, bucket, limit],
      );
      return (r.rowCount ?? 0) > 0;
    },
  };
}
