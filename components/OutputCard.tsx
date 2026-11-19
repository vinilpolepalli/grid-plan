import { OUTPUT_META, type OutputKey } from '@/lib/model';
import { fmt } from '@/lib/client';

export const CAVEAT = 'modeled from the stated assumptions, not an engineering estimate';

export default function OutputCard({ k, value, formula }: { k: OutputKey; value: number; formula: string }) {
  const m = OUTPUT_META[k];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{m.label}</span>
        <span className="chip-modeled">MODELED</span>
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold">
        {fmt(value, m.digits)} <span className="text-sm font-normal text-ink-soft">{m.unit}</span>
      </div>
      <p className="mt-1 text-xs text-ink-faint">{CAVEAT}</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-ink-soft">Formula and constants</summary>
        <code className="mt-1 block break-words font-mono text-ink-soft">{formula}</code>
      </details>
    </div>
  );
}
