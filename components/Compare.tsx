'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { COOLING_LABEL, OUTPUT_KEYS, OUTPUT_META } from '@/lib/model';
import { api, fmt, sgn, type CompareResult, type ScenarioView } from '@/lib/client';
import { CAVEAT } from './OutputCard';

export default function Compare() {
  const [list, setList] = useState<ScenarioView[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [cmp, setCmp] = useState<CompareResult | null>(null);
  const [err, setErr] = useState('');

  const reload = useCallback(() => api<{ scenarios: ScenarioView[] }>('/api/scenarios').then((r) => setList(r.scenarios)).catch((e) => setErr(e.message)), []);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (picked.length < 2) { setCmp(null); return; }
    api<CompareResult>('/api/compare', 'POST', { ids: picked }).then((r) => { setCmp(r); setErr(''); }).catch((e) => setErr(e.message));
  }, [picked]);

  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]);
  async function del(id: string) {
    try { await api(`/api/scenarios/${id}`, 'DELETE'); setPicked((p) => p.filter((x) => x !== id)); await reload(); } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-ink-soft">Pick 2-4 saved scenarios. Deltas are computed on the server relative to the first one you picked. Each scenario is evaluated with the assumption version that saved it.</p>
      {err && <p role="alert" className="rounded-card border border-signal/40 p-3 text-sm text-signal">{err}</p>}
      <section className="card p-4" aria-label="Saved scenarios">
        <h2 className="label mb-2">Saved scenarios</h2>
        {list === null ? <p className="text-sm text-ink-faint">Loading...</p> : list.length === 0 ? (
          <p className="text-sm text-ink-soft">None yet. Save one from the <Link className="text-signal underline" href="/">sandbox</Link>.</p>
        ) : (
          <ul className="divide-y divide-hair">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input type="checkbox" className="accent-signal" checked={picked.includes(s.id)} disabled={!picked.includes(s.id) && picked.length >= 4} onChange={() => toggle(s.id)} />
                  <span className="font-medium">{s.name}</span>
                  <span className="chip">v{s.assumptionVersion}</span>
                  <span className="text-xs text-ink-faint">{s.inputs.itMw} MW · {s.inputs.tier} · {COOLING_LABEL[s.inputs.cooling]} · PUE {s.inputs.pue}</span>
                </label>
                <Link className="btn-ghost" href={`/?scenario=${s.id}`}>Open</Link>
                <button className="btn-ghost" onClick={() => del(s.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {cmp && (
        <section className="card overflow-x-auto p-4" aria-label="Comparison">
          <div className="mb-2 flex items-center gap-2"><h2 className="label">Comparison</h2><span className="chip-modeled">MODELED</span></div>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="label py-1 pr-3">&nbsp;</th>
                {cmp.scenarios.map((s) => <th key={s.id} className="py-1 pr-3 text-right font-semibold">{s.name}{s.id === cmp.baseId && <span className="chip ml-1">base</span>}</th>)}
              </tr>
            </thead>
            <tbody>
              <Row label="Assumptions" cells={cmp.scenarios.map((s) => `v${s.assumptionVersion}`)} />
              <Row label="IT load" cells={cmp.scenarios.map((s) => `${fmt(s.inputs.itMw, 0)} MW`)} />
              <Row label="Tier" cells={cmp.scenarios.map((s) => s.inputs.tier)} />
              <Row label="Cooling" cells={cmp.scenarios.map((s) => COOLING_LABEL[s.inputs.cooling])} />
              <Row label="PUE" cells={cmp.scenarios.map((s) => fmt(s.inputs.pue, 2))} />
              {OUTPUT_KEYS.map((k) => (
                <tr key={k} className="border-t border-hair">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">{OUTPUT_META[k].label} <span className="text-ink-faint">({OUTPUT_META[k].unit})</span></th>
                  {cmp.scenarios.map((s) => {
                    const d = cmp.deltas[s.id]?.[k];
                    return (
                      <td key={s.id} className="py-1.5 pr-3 text-right font-mono">
                        {fmt(s.outputs[k], OUTPUT_META[k].digits)}
                        {d && <div className="text-xs text-ink-faint">{sgn(d.abs, OUTPUT_META[k].digits)}{d.pct !== null && ` (${sgn(d.pct, 1)}%)`}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-faint">ILLUSTRATIVE: {CAVEAT}.</p>
        </section>
      )}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-t border-hair">
      <th scope="row" className="py-1.5 pr-3 text-left font-medium">{label}</th>
      {cells.map((c, i) => <td key={i} className="py-1.5 pr-3 text-right font-mono">{c}</td>)}
    </tr>
  );
}
