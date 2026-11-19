import type { Constants, Inputs } from '../model';

export interface AssumptionSet { id: string; version: number; constants: Constants; createdAt: string }
export interface ScenarioRow { id: string; name: string; inputs: Inputs; assumptionSetId: string; createdAt: string }

export interface Store {
  /** Current (highest-version) set for the owner; creates v1 from defaults on first use. */
  currentSet(owner: string): Promise<AssumptionSet>;
  listSets(owner: string): Promise<AssumptionSet[]>;
  getSetById(owner: string, id: string): Promise<AssumptionSet | null>;
  createSet(owner: string, constants: Constants): Promise<AssumptionSet>;
  listScenarios(owner: string): Promise<ScenarioRow[]>;
  getScenario(owner: string, id: string): Promise<ScenarioRow | null>;
  createScenario(owner: string, name: string, inputs: Inputs, setId: string): Promise<ScenarioRow>;
  deleteScenario(owner: string, id: string): Promise<boolean>;
  /** Count one write in the current hour; false when over the limit. */
  allowWrite(owner: string, limit: number, now?: number): Promise<boolean>;
}

let instance: Promise<Store> | null = null;
export function getStore(): Promise<Store> {
  if (!instance) {
    instance = process.env.DATABASE_URL
      ? import('./pg').then((m) => m.createPgStore(process.env.DATABASE_URL as string))
      : import('./sqlite').then((m) => m.createSqliteStore(process.env.GRIDPLAN_DB || 'gridplan.db'));
  }
  return instance;
}
