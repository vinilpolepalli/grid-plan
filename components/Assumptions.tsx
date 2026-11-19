'use client';
import { useEffect, useState } from 'react';
import { COOLINGS, COOLING_LABEL, TIERS, type Constants } from '@/lib/model';
import { api } from '@/lib/client';

interface Set { id: string; version: number; constants: Constants; createdAt: string }

export default function Assumptions() {
  const [hist, setHist] = useState<Set[]>([]);
  const [draft, setDraft] = useState<Constants | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => api<{ current: Set; history: Set[] }>('/api/assumptions').then((r) => { setHist(r.history); setDraft(structuredClone(r.current.constants)); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (!draft) return <p className="text-sm text-ink-faint">{err || 'Loading...'}</p>;

  const cur = hist[0];
  const setGroup = (g: 'kwPerRack' | 'm2PerRack', c: (typeof COOLINGS)[number], v: string) => setDraft({ ...draft, [g]: { ...draft[g], [c]: Number(v) } });
  const setTier = (t: (typeof TIERS)[number], v: string) => setDraft({ ...draft, tierMult: { ...draft.tierMult, [t]: Number(v) } });
  const setScalar = (k: 'hoursPerYear' | 'ft2PerM2' | 'powerFactor' | 'tonsPerMw', v: string) => setDraft({ ...draft, [k]: Number(v) });

  async function save() {
    setMsg(''); setErr('');
    try {
      const r = await api<{ current: Set }>('/api/assumptions', 'POST', { constants: draft });
      setMsg(`Saved as version ${r.current.version}. Existing scenarios keep the version that computed them.`);
      await load();
    } catch (e) { setErr((e as Error).message); }
  }

  const N = (props: { id: string; label: string; value: number; step: number; onChange: (v: string) => void }) => (
    <div>
      <label htmlFor={props.id} className="label mb-1 block">{props.label}</label>
      <input id={props.id} type="number" step={props.step} className="field" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-ink-soft">Every constant the model uses. Edit and save to create a new version; only your own scenarios and assumptions are visible to you. ILLUSTRATIVE values chosen by this demo, not sourced engineering data.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="card space-y-5 p-4" aria-label="Constants">
          <div className="flex items-center gap-2"><h2 className="label">Constants</h2>{cur && <span className="chip">editing from v{cur.version}</span>}</div>
          <div><h3 className="mb-2 text-sm font-medium">Rack density (kW per rack)</h3>
            <div className="grid gap-3 sm:grid-cols-3">{COOLINGS.map((c) => <N key={c} id={`kw-${c}`} label={COOLING_LABEL[c]} value={draft.kwPerRack[c]} step={1} onChange={(v) => setGroup('kwPerRack', c, v)} />)}</div></div>
          <div><h3 className="mb-2 text-sm font-medium">Whitespace per rack incl. aisles (m²)</h3>
            <div className="grid gap-3 sm:grid-cols-3">{COOLINGS.map((c) => <N key={c} id={`m2-${c}`} label={COOLING_LABEL[c]} value={draft.m2PerRack[c]} step={0.1} onChange={(v) => setGroup('m2PerRack', c, v)} />)}</div></div>
          <div><h3 className="mb-2 text-sm font-medium">Tier multipliers (feed and cooling)</h3>
            <div className="grid gap-3 sm:grid-cols-3">{TIERS.map((t) => <N key={t} id={`tier-${t}`} label={t} value={draft.tierMult[t]} step={0.05} onChange={(v) => setTier(t, v)} />)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <N id="hours" label="Hours per year" value={draft.hoursPerYear} step={1} onChange={(v) => setScalar('hoursPerYear', v)} />
            <N id="ft2" label="ft² per m²" value={draft.ft2PerM2} step={0.001} onChange={(v) => setScalar('ft2PerM2', v)} />
            <N id="pf" label="Power factor" value={draft.powerFactor} step={0.01} onChange={(v) => setScalar('powerFactor', v)} />
            <N id="tons" label="Refrigeration tons per MW thermal" value={draft.tonsPerMw} step={0.001} onChange={(v) => setScalar('tonsPerMw', v)} />
          </div>
          {err && <p role="alert" className="text-sm text-signal">{err}</p>}
          {msg && <p role="status" className="text-sm text-ink-soft">{msg}</p>}
          <button className="btn" onClick={save}>Save as new version</button>
        </section>
        <section className="card h-fit p-4" aria-label="Versions">
          <h2 className="label mb-2">Versions</h2>
          <ul className="space-y-1 text-sm">
            {hist.map((h) => <li key={h.id} className="flex justify-between"><span className="font-medium">v{h.version}{h === cur && ' (current)'}</span><span className="text-xs text-ink-faint">{h.createdAt.slice(0, 16).replace('T', ' ')}</span></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
