'use client';
import { useEffect, useRef, useState } from 'react';
import { COOLINGS, COOLING_LABEL, OUTPUT_META, TIERS, type Cooling, type Inputs, type OutputKey, type Tier } from '@/lib/model';
import { api, fmt, type ComputeResult, type ScenarioView } from '@/lib/client';
import OutputCard, { CAVEAT } from './OutputCard';
import Schematic from './Schematic';

const DEFAULT: Inputs = { itMw: 60, tier: 'N+1', cooling: 'liquid', pue: 1.3 };
const CARDS: OutputKey[] = ['facilityMw', 'racks', 'whitespaceM2', 'feedMw', 'feedMva', 'energyGwh', 'coolingMwt'];
const MATRIX_METRICS: OutputKey[] = ['feedMw', 'racks', 'whitespaceM2', 'energyGwh', 'coolingMwt', 'facilityMw'];

function Seg<T extends string>({ name, value, options, label, onChange }: {
  name: string; value: T; options: { v: T; l: string }[]; label: string; onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="label mb-1">{label}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-btn border border-hair p-1">
        {options.map((o) => (
          <label key={o.v} className={`cursor-pointer rounded-[6px] px-2 py-1.5 text-center text-xs ${value === o.v ? 'bg-signal text-white' : 'text-ink-soft hover:bg-zinc-100'}`}>
            <input type="radio" name={name} className="sr-only" checked={value === o.v} onChange={() => onChange(o.v)} />
            {o.l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Sandbox() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT);
  const [res, setRes] = useState<ComputeResult | null>(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState('');
  const [metric, setMetric] = useState<OutputKey>('feedMw');
  const loaded = useRef(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('scenario');
    if (!id) { loaded.current = true; return; }
    api<{ scenario: ScenarioView }>(`/api/scenarios/${encodeURIComponent(id)}`)
      .then((r) => { setInputs(r.scenario.inputs); setName(r.scenario.name); })
      .catch((e) => setErr(e.message))
      .finally(() => { loaded.current = true; });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => {
      api<ComputeResult>('/api/compute', 'POST', { inputs }, ac.signal)
        .then((r) => { setRes(r); setErr(''); })
        .catch((e) => { if (e.name !== 'AbortError') setErr(e.message); });
    }, 120);
    return () => { clearTimeout(t); ac.abort(); };
  }, [inputs]);

  async function save() {
    setSaved('');
    try {
      const r = await api<{ scenario: ScenarioView }>('/api/scenarios', 'POST', { name, inputs });
      setSaved(`Saved "${r.scenario.name}" against assumptions v${r.scenario.assumptionVersion}.`);
      setName('');
    } catch (e) { setSaved((e as Error).message); }
  }

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const numSet = (k: 'itMw' | 'pue', raw: string) => { const n = Number(raw); if (raw !== '' && Number.isFinite(n)) set(k, n); };

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-ink-soft">
        A planning worksheet for a fictional campus. Every figure is derived from the visible, editable assumptions and is planning math only: not engineering advice, no real site data.
      </p>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <section className="card h-fit space-y-5 p-4" aria-label="Inputs">
          <h2 className="label">Inputs</h2>
          <div>
            <label htmlFor="it" className="label mb-1 block">IT load (MW)</label>
            <input id="it" type="number" min={1} max={1000} step={1} className="field" value={inputs.itMw} onChange={(e) => numSet('itMw', e.target.value)} />
            <input aria-label="IT load slider" type="range" min={1} max={300} step={1} className="mt-2 w-full accent-signal" value={Math.min(inputs.itMw, 300)} onChange={(e) => set('itMw', Number(e.target.value))} />
            <p className="mt-1 text-xs text-ink-faint">Allowed 1-1000 MW. Slider covers 1-300.</p>
          </div>
          <Seg name="tier" label="Redundancy tier" value={inputs.tier} options={TIERS.map((t) => ({ v: t as Tier, l: t }))} onChange={(v) => set('tier', v)} />
          <Seg name="cooling" label="Cooling approach" value={inputs.cooling} options={COOLINGS.map((c) => ({ v: c as Cooling, l: c === 'liquid' ? 'Liquid' : COOLING_LABEL[c] }))} onChange={(v) => set('cooling', v)} />
          <div>
            <label htmlFor="pue" className="label mb-1 block">PUE</label>
            <input id="pue" type="number" min={1} max={2.5} step={0.01} className="field" value={inputs.pue} onChange={(e) => numSet('pue', e.target.value)} />
            <input aria-label="PUE slider" type="range" min={1} max={2.5} step={0.01} className="mt-2 w-full accent-signal" value={inputs.pue} onChange={(e) => set('pue', Number(e.target.value))} />
          </div>
          <div className="border-t border-hair pt-4">
            <label htmlFor="nm" className="label mb-1 block">Save as scenario</label>
            <input id="nm" className="field font-sans" maxLength={80} placeholder="Scenario name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn mt-2 w-full" disabled={!name.trim()} onClick={save}>Save scenario</button>
            {saved && <p role="status" className="mt-2 text-xs text-ink-soft">{saved}</p>}
          </div>
        </section>

        <section aria-label="Outputs" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="label">Outputs</h2>
            {res && <span className="chip">Assumptions v{res.assumptionVersion}</span>}
          </div>
          {err && <p role="alert" className="rounded-card border border-signal/40 p-3 text-sm text-signal">{err}</p>}
          {res ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {CARDS.map((k) => <OutputCard key={k} k={k} value={res.outputs[k]} formula={res.formulas[k]} />)}
            </div>
          ) : !err && <p className="text-sm text-ink-faint">Computing...</p>}
        </section>
      </div>

      {res && (
        <>
          <section className="card p-4" aria-label="Sensitivity">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="label">Sensitivity: tier x cooling</h2>
                <p className="text-xs text-ink-faint">MODELED / ILLUSTRATIVE. Same model at {fmt(inputs.itMw, 0)} MW, PUE {inputs.pue}; {CAVEAT}.</p>
              </div>
              <select aria-label="Matrix metric" className="field w-auto font-sans" value={metric} onChange={(e) => setMetric(e.target.value as OutputKey)}>
                {MATRIX_METRICS.map((k) => <option key={k} value={k}>{OUTPUT_META[k].label} ({OUTPUT_META[k].unit})</option>)}
              </select>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead><tr className="text-left"><th className="label py-1 pr-2">Tier</th>{COOLINGS.map((c) => <th key={c} className="label py-1 pr-2 text-right">{COOLING_LABEL[c]}</th>)}</tr></thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t} className="border-t border-hair">
                      <th scope="row" className="py-1.5 pr-2 text-left font-medium">{t}</th>
                      {COOLINGS.map((c) => {
                        const cell = res.sensitivity.find((x) => x.tier === t && x.cooling === c)!;
                        const cur = t === inputs.tier && c === inputs.cooling;
                        return <td key={c} className={`py-1.5 pr-2 text-right font-mono ${cur ? 'font-semibold text-signal' : ''}`}>{fmt(cell.outputs[metric], OUTPUT_META[metric].digits)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card p-4" aria-label="Schematic">
            <h2 className="label mb-2">Campus block schematic</h2>
            <Schematic racks={res.outputs.racks} cooling={inputs.cooling} />
          </section>
        </>
      )}
    </div>
  );
}
