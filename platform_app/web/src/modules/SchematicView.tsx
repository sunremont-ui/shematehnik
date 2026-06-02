import { useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

interface Comp { id: number; ref: string; kind: string; x: number; y: number; value: string; }

const PALETTE = [
  { kind: "R", label: "Resistor", value: "10k" },
  { kind: "C", label: "Capacitor", value: "100n" },
  { kind: "L", label: "Inductor", value: "10u" },
  { kind: "D", label: "Diode", value: "1N4148" },
  { kind: "Q", label: "Transistor", value: "2N2222" },
  { kind: "U", label: "IC", value: "STM32F401" },
];

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

export function SchematicView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["schematic"];
  const [comps, setComps] = useState<Comp[]>([
    { id: 1, ref: "R1", kind: "R", x: 160, y: 140, value: "10k" },
    { id: 2, ref: "C1", kind: "C", x: 320, y: 140, value: "100n" },
    { id: 3, ref: "U1", kind: "U", x: 240, y: 280, value: "STM32F401" },
  ]);
  const [sel, setSel] = useState<number | null>(null);
  const counters = useRef<Record<string, number>>({ R: 1, C: 1, L: 0, D: 0, Q: 0, U: 1 });
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function add(kind: string, value: string) {
    counters.current[kind] = (counters.current[kind] ?? 0) + 1;
    const id = Date.now();
    setComps((c) => [...c, { id, ref: `${kind}${counters.current[kind]}`, kind, x: 120, y: 80, value }]);
    ucp.setStatus(`Placed ${kind}${counters.current[kind]}`);
    ucp.markModified();
  }

  function onDown(e: React.PointerEvent, comp: Comp) {
    const pt = toLocal(e);
    drag.current = { id: comp.id, dx: pt.x - comp.x, dy: pt.y - comp.y };
    setSel(comp.id);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const pt = toLocal(e);
    setComps((cs) => cs.map((c) => c.id === drag.current!.id
      ? { ...c, x: snap(pt.x - drag.current!.dx), y: snap(pt.y - drag.current!.dy) } : c));
  }
  function onUp() {
    if (drag.current) { ucp.markModified(); drag.current = null; }
  }
  function toLocal(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  const selected = comps.find((c) => c.id === sel) ?? null;

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={() => ucp.setStatus("Netlist generated")}>Netlist</button>
          <button className="btn primary" onClick={() => ucp.setStatus("SPICE simulation queued")}>Simulate</button>
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 220px", gap: 12 }}>
        {/* Palette */}
        <div className="card" style={{ padding: 10 }}>
          <div className="muted" style={{ marginBottom: 8, fontSize: 11 }}>COMPONENTS</div>
          {PALETTE.map((p) => (
            <button key={p.kind} className="btn" style={{ width: "100%", marginBottom: 6, textAlign: "left" }}
              onClick={() => add(p.kind, p.value)}>
              <b>{p.kind}</b> · {p.label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <svg ref={svgRef} width="100%" height="440" style={{ display: "block", background: "var(--base)" }}
            onPointerMove={onMove} onPointerUp={onUp} onClick={(e) => { if (e.target === svgRef.current) setSel(null); }}>
            <defs>
              <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="var(--border)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* simple wires between first three comps */}
            {comps.length >= 2 && (
              <polyline points={wire(comps[0], comps[1])} fill="none" stroke="var(--accent-soft)" strokeWidth="2" />
            )}
            {comps.map((c) => (
              <CompSym key={c.id} c={c} selected={c.id === sel}
                onPointerDown={(e) => onDown(e, c)} />
            ))}
          </svg>
        </div>

        {/* Properties */}
        <div className="card">
          <div className="muted" style={{ marginBottom: 10, fontSize: 11 }}>PROPERTIES</div>
          {selected ? (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field">Reference
                <input value={selected.ref} onChange={(e) => upd(selected.id, { ref: e.target.value })} />
              </label>
              <label className="field">Value
                <input value={selected.value} onChange={(e) => upd(selected.id, { value: e.target.value })} />
              </label>
              <div className="muted">Pos: {selected.x}, {selected.y}</div>
              <button className="btn" onClick={() => { setComps((cs) => cs.filter((c) => c.id !== selected.id)); setSel(null); ucp.markModified(); }}>
                Delete
              </button>
            </div>
          ) : <p className="muted">Выберите компонент на схеме.</p>}
        </div>
      </div>
    </div>
  );

  function upd(id: number, patch: Partial<Comp>) {
    setComps((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    ucp.markModified();
  }
}

function wire(a: Comp, b: Comp) {
  const mx = (a.x + b.x) / 2;
  return `${a.x + 24},${a.y} ${mx},${a.y} ${mx},${b.y} ${b.x - 24},${b.y}`;
}

function CompSym({ c, selected, onPointerDown }: {
  c: Comp; selected: boolean; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const stroke = selected ? "var(--accent)" : "var(--text)";
  return (
    <g transform={`translate(${c.x},${c.y})`} style={{ cursor: "grab" }} onPointerDown={onPointerDown}>
      <line x1={-24} y1={0} x2={-16} y2={0} stroke={stroke} strokeWidth="2" />
      <line x1={16} y1={0} x2={24} y2={0} stroke={stroke} strokeWidth="2" />
      {c.kind === "R" ? (
        <rect x={-16} y={-8} width={32} height={16} fill="none" stroke={stroke} strokeWidth="2" />
      ) : c.kind === "C" ? (
        <>
          <line x1={-3} y1={-12} x2={-3} y2={12} stroke={stroke} strokeWidth="2.5" />
          <line x1={3} y1={-12} x2={3} y2={12} stroke={stroke} strokeWidth="2.5" />
        </>
      ) : c.kind === "U" ? (
        <rect x={-22} y={-18} width={44} height={36} rx={3} fill="var(--raised)" stroke={stroke} strokeWidth="2" />
      ) : (
        <circle r={14} fill="none" stroke={stroke} strokeWidth="2" />
      )}
      <text x={0} y={-22} textAnchor="middle" fill="var(--accent-soft)" fontSize="11" fontFamily="monospace">{c.ref}</text>
      <text x={0} y={30} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="monospace">{c.value}</text>
    </g>
  );
}
