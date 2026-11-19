import { type Cooling, COOLING_LABEL } from '@/lib/model';

type Layout = 'wide' | 'tall';
const MAX_BLOCKS = 96;

function Drawing({ racks, cooling, layout }: { racks: number; cooling: Cooling; layout: Layout }) {
  const wide = layout === 'wide';
  const per = Math.max(1, Math.ceil(racks / MAX_BLOCKS));
  const blocks = Math.ceil(racks / per);
  const perRow = wide ? 16 : 12;
  const rows = Math.ceil(blocks / perRow);
  const W = wide ? 640 : 340;
  const gridX = wide ? 150 : 16;
  const gridY = wide ? 30 : 150;
  const gridW = wide ? 474 : 308;
  const bw = gridW / perRow;
  const rowH = wide ? 26 : 22;
  const bh = rowH - 6;
  const gridBottom = gridY + Math.max(rows, 1) * rowH;
  const H = wide ? Math.max(260, gridBottom + 50) : gridBottom + 52;
  const cells = Array.from({ length: blocks }, (_, i) => ({ x: gridX + (i % perRow) * bw, y: gridY + Math.floor(i / perRow) * rowH }));
  const label = `Schematic, not to scale: ${blocks} rack blocks (${per} rack${per > 1 ? 's' : ''} each), cooling plant and substation.`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={wide ? 'sv-wide' : 'sv-tall'}>
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="10" className="sv-frame" />
      {wide ? (
        <>
          <rect x="16" y="30" width="116" height="90" rx="6" className="sv-sub" />
          <text x="74" y="70" className="sv-t" textAnchor="middle">Substation</text>
          <text x="74" y="88" className="sv-s" textAnchor="middle">utility feed</text>
          <rect x="16" y="140" width="116" height="90" rx="6" className="sv-cool" />
          <text x="74" y="180" className="sv-t" textAnchor="middle">Cooling plant</text>
          <text x="74" y="198" className="sv-s" textAnchor="middle">{COOLING_LABEL[cooling]}</text>
          <path d="M132 75H142V185H132M142 130H150" className="sv-line" />
        </>
      ) : (
        <>
          <rect x="16" y="16" width="148" height="80" rx="6" className="sv-sub" />
          <text x="90" y="52" className="sv-t" textAnchor="middle">Substation</text>
          <text x="90" y="70" className="sv-s" textAnchor="middle">utility feed</text>
          <rect x="176" y="16" width="148" height="80" rx="6" className="sv-cool" />
          <text x="250" y="52" className="sv-t" textAnchor="middle">Cooling plant</text>
          <text x="250" y="70" className="sv-s" textAnchor="middle">{COOLING_LABEL[cooling]}</text>
          <path d="M90 96V122H250V96M170 122V150" className="sv-line" />
        </>
      )}
      {cells.map((c, i) => <rect key={i} x={c.x + 1.5} y={c.y} width={bw - 3} height={bh} rx="2" className="sv-rack" />)}
      <text x={wide ? gridX : 16} y={H - 28} className="sv-s">{blocks} blocks · 1 block = {per} rack{per > 1 ? 's' : ''}</text>
      <text x={wide ? gridX : 16} y={H - 12} className="sv-s sv-warn">SCHEMATIC - NOT TO SCALE</text>
    </svg>
  );
}

export default function Schematic({ racks, cooling }: { racks: number; cooling: Cooling }) {
  return (
    <figure>
      <Drawing racks={racks} cooling={cooling} layout="wide" />
      <Drawing racks={racks} cooling={cooling} layout="tall" />
      <figcaption className="mt-2 text-xs text-ink-faint">
        Schematic, not to scale. {racks.toLocaleString()} racks modeled; blocks grow with the computed rack count.
        Modeled from the stated assumptions, not an engineering estimate.
      </figcaption>
    </figure>
  );
}
