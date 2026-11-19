import type { Constants, Inputs, Outputs, OutputKey, SensitivityCell, Delta } from './model';

export interface ScenarioView {
  id: string; name: string; createdAt: string; inputs: Inputs; assumptionVersion: number;
  constants: Constants; outputs: Outputs; formulas: Record<OutputKey, string>;
}
export interface ComputeResult {
  assumptionVersion: number; constants: Constants; outputs: Outputs;
  formulas: Record<OutputKey, string>; sensitivity: SensitivityCell[];
}
export interface CompareResult { baseId: string; scenarios: ScenarioView[]; deltas: Record<string, Record<OutputKey, Delta>> }

export async function api<T>(url: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method, signal,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `request failed (${res.status})`);
  return data as T;
}

export const fmt = (n: number, digits: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const sgn = (n: number, digits: number) => (n > 0 ? '+' : n < 0 ? '-' : '') + fmt(Math.abs(n), digits);
