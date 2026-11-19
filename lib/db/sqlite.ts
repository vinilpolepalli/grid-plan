import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { DEFAULT_CONSTANTS } from '../model';
import type { AssumptionSet, ScenarioRow, Store } from './store';

export const assumptionSets = sqliteTable('assumption_sets', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  version: integer('version').notNull(),
  constants: text('constants').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [uniqueIndex('assumption_owner_version').on(t.ownerId, t.version)]);

export const scenarios = sqliteTable('scenarios', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  inputs: text('inputs').notNull(),
  assumptionSetId: text('assumption_set_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const writeCounts = sqliteTable('write_counts', {
  ownerId: text('owner_id').notNull(),
  bucket: integer('bucket').notNull(),
  count: integer('count').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.bucket] })]);

const toSet = (r: typeof assumptionSets.$inferSelect): AssumptionSet =>
  ({ id: r.id, version: r.version, constants: JSON.parse(r.constants), createdAt: r.createdAt });
const toScenario = (r: typeof scenarios.$inferSelect): ScenarioRow =>
  ({ id: r.id, name: r.name, inputs: JSON.parse(r.inputs), assumptionSetId: r.assumptionSetId, createdAt: r.createdAt });

export function createSqliteStore(file: string): Store {
  const raw = new Database(file);
  raw.pragma('journal_mode = WAL');
  raw.exec(`
    CREATE TABLE IF NOT EXISTS assumption_sets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL, constants TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS assumption_owner_version ON assumption_sets(owner_id, version);
    CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, inputs TEXT NOT NULL, assumption_set_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS scenarios_owner ON scenarios(owner_id);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);
  const db = drizzle(raw);

  const latest = (owner: string) =>
    db.select().from(assumptionSets).where(eq(assumptionSets.ownerId, owner)).orderBy(desc(assumptionSets.version)).limit(1).get();
  const insertSet = (owner: string, constants: unknown, version: number) => {
    const row = { id: randomUUID(), ownerId: owner, version, constants: JSON.stringify(constants), createdAt: new Date().toISOString() };
    db.insert(assumptionSets).values(row).run();
    return toSet(row);
  };

  return {
    async currentSet(owner) {
      return db.transaction(() => {
        const r = latest(owner);
        return r ? toSet(r) : insertSet(owner, DEFAULT_CONSTANTS, 1);
      });
    },
    async listSets(owner) {
      return db.select().from(assumptionSets).where(eq(assumptionSets.ownerId, owner)).orderBy(desc(assumptionSets.version)).all().map(toSet);
    },
    async getSetById(owner, id) {
      const r = db.select().from(assumptionSets).where(and(eq(assumptionSets.ownerId, owner), eq(assumptionSets.id, id))).get();
      return r ? toSet(r) : null;
    },
    async createSet(owner, constants) {
      return db.transaction(() => insertSet(owner, constants, (latest(owner)?.version ?? 0) + 1));
    },
    async listScenarios(owner) {
      return db.select().from(scenarios).where(eq(scenarios.ownerId, owner)).orderBy(desc(scenarios.createdAt)).all().map(toScenario);
    },
    async getScenario(owner, id) {
      const r = db.select().from(scenarios).where(and(eq(scenarios.ownerId, owner), eq(scenarios.id, id))).get();
      return r ? toScenario(r) : null;
    },
    async createScenario(owner, name, inputs, setId) {
      const row = { id: randomUUID(), ownerId: owner, name, inputs: JSON.stringify(inputs), assumptionSetId: setId, createdAt: new Date().toISOString() };
      db.insert(scenarios).values(row).run();
      return toScenario(row);
    },
    async deleteScenario(owner, id) {
      return db.delete(scenarios).where(and(eq(scenarios.ownerId, owner), eq(scenarios.id, id))).run().changes > 0;
    },
    async allowWrite(owner, limit, now = Date.now()) {
      const bucket = Math.floor(now / 3_600_000);
      return db.transaction(() => {
        db.insert(writeCounts).values({ ownerId: owner, bucket, count: 0 }).onConflictDoNothing().run();
        const cur = db.select().from(writeCounts).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).get()!;
        if (cur.count >= limit) return false;
        db.update(writeCounts).set({ count: sql`${writeCounts.count} + 1` }).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).run();
        db.delete(writeCounts).where(sql`${writeCounts.bucket} < ${bucket}`).run();
        return true;
      });
    },
  };
}
