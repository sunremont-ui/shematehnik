import { useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import type { SchComponent } from "../project.ts";
import { pinsOf, pinOffset, runDrc } from "../project.ts";
import { PanelHead } from "./common.tsx";

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

// Положение вывода компонента в мировых координатах.
function pinPos(c: SchComponent, pin: string) {
  const { dx, dy } = pinOffset(c.kind, pin);
  return { x: c.x + dx, y: c.y + dy };
}

export function SchematicView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["schematic"];
  const comps = ucp.project.components;        // ← общая модель проекта
  const wires = ucp.project.wires;
  const [sel, setSel] = useState<string | null>(null);
  const [wireMode, setWireMode] = useState(false);
  const [erc, setErc] = useState(false);
  const [pending, setPending] = useState<{ ref: string; pin: string } | null>(null);

  // ERC: множество висящих выводов (из общей модели через runDrc).
  const floating = useMemo(() => new Set(runDrc(ucp.project).floating), [ucp.project]);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const byRef = (ref: string) => comps.find((c) => c.ref === ref);
  function onPinClick(ref: string, pin: string) {
    if (!pending) { setPending({ ref, pin }); ucp.setStatus(`Wire from ${ref}.${pin}…`); return; }
    ucp.addWire(pending, { ref, pin });
    setPending(null);
  }

  function onDown(e: React.PointerEvent, comp: SchComponent) {
    const pt = toLocal(e);
    drag.current = { id: comp.id, dx: pt.x - comp.x, dy: pt.y - comp.y };
    setSel(comp.id);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const pt = toLocal(e);
    ucp.updateComponent(drag.current.id, {
      x: snap(pt.x - drag.current.dx), y: snap(pt.y - drag.current.dy),
    });
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
          <button className={`btn${wireMode ? " primary" : ""}`} onClick={() => { setWireMode((w) => !w); setPending(null); ucp.setStatus(wireMode ? "Select mode" : "Wire mode: click two pins"); }}>
            {wireMode ? "Wire ✓" : "Wire"}
          </button>
          <button className={`btn${erc ? " primary" : ""}`} onClick={() => { setErc((e) => !e); ucp.setStatus(erc ? "ERC off" : `ERC: ${floating.size} floating pins`); }}>
            ERC{erc ? " ✓" : ""}
          </button>
          <span className="chip"><span className="dot ok" />{wires.length} wires</span>
          {erc && <span className="chip"><span className={`dot ${floating.size ? "warn" : "ok"}`} />{floating.size} floating</span>}
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 220px", gap: 12 }}>
        {/* Palette */}
        <div className="card" style={{ padding: 10 }}>
          <div className="muted" style={{ marginBottom: 8, fontSize: 11 }}>COMPONENTS</div>
          {PALETTE.map((p) => (
            <button key={p.kind} className="btn" style={{ width: "100%", marginBottom: 6, textAlign: "left" }}
              onClick={() => ucp.addComponent(p.kind, p.value)}>
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
            {/* реальные провода из модели */}
            {wires.map((w, i) => {
              const a = byRef(w.from.ref), b = byRef(w.to.ref);
              if (!a || !b) return null;
              const p1 = pinPos(a, w.from.pin), p2 = pinPos(b, w.to.pin);
              return (
                <polyline key={i} points={wire(p1, p2)} fill="none" stroke="var(--accent-soft)" strokeWidth="2"
                  style={{ cursor: wireMode ? "pointer" : "default" }}
                  onClick={(e) => { if (wireMode) { e.stopPropagation(); ucp.removeWire(i); } }} />
              );
            })}
            {comps.map((c) => (
              <CompSym key={c.id} c={c} selected={c.id === sel}
                onPointerDown={(e) => { if (!wireMode) onDown(e, c); }} />
            ))}
            {/* ERC: красные маркеры на висящих выводах */}
            {erc && comps.flatMap((c) =>
              pinsOf(c.kind).filter((pin) => floating.has(`${c.ref}.${pin}`)).map((pin) => {
                const p = pinPos(c, pin);
                return <circle key={`erc-${c.id}-${pin}`} cx={p.x} cy={p.y} r={7} fill="none" stroke="var(--danger)" strokeWidth="2" pointerEvents="none" />;
              }),
            )}
            {/* кликабельные выводы в режиме провода */}
            {wireMode && comps.flatMap((c) =>
              pinsOf(c.kind).map((pin) => {
                const p = pinPos(c, pin);
                const active = pending?.ref === c.ref && pending?.pin === pin;
                return (
                  <circle key={`${c.id}-${pin}`} cx={p.x} cy={p.y} r={6}
                    fill={active ? "var(--accent)" : "var(--panel)"} stroke="var(--accent-soft)" strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); onPinClick(c.ref, pin); }} />
                );
              }),
            )}
          </svg>
        </div>

        {/* Properties */}
        <div className="card">
          <div className="muted" style={{ marginBottom: 10, fontSize: 11 }}>PROPERTIES</div>
          {selected ? (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field">Reference
                <input value={selected.ref} onChange={(e) => { ucp.updateComponent(selected.id, { ref: e.target.value }); ucp.markModified(); }} />
              </label>
              <label className="field">Value
                <input value={selected.value} onChange={(e) => { ucp.updateComponent(selected.id, { value: e.target.value }); ucp.markModified(); }} />
              </label>
              <div className="muted">Pos: {selected.x}, {selected.y}</div>
              <button className="btn" onClick={() => { ucp.removeComponent(selected.id); setSel(null); }}>
                Delete
              </button>
            </div>
          ) : <p className="muted">Выберите компонент на схеме.</p>}
        </div>
      </div>
    </div>
  );
}

// Ортогональная разводка между двумя выводами.
function wire(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  return `${a.x},${a.y} ${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

function CompSym({ c, selected, onPointerDown }: {
  c: SchComponent; selected: boolean; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const stroke = selected ? "var(--accent)" : "var(--text)";
  const isU = c.kind === "U";
  return (
    <g transform={`translate(${c.x},${c.y})`} style={{ cursor: "grab" }} onPointerDown={onPointerDown}>
      {/* стабы выводов */}
      {pinsOf(c.kind).map((pin) => {
        const { dx, dy } = pinOffset(c.kind, pin);
        const ix = isU ? Math.sign(dx) * 22 : Math.sign(dx) * 16;
        return <line key={pin} x1={dx} y1={dy} x2={ix} y2={dy} stroke={stroke} strokeWidth="2" />;
      })}
      {c.kind === "R" ? (
        <rect x={-16} y={-8} width={32} height={16} fill="none" stroke={stroke} strokeWidth="2" />
      ) : c.kind === "C" ? (
        <>
          <line x1={-3} y1={-12} x2={-3} y2={12} stroke={stroke} strokeWidth="2.5" />
          <line x1={3} y1={-12} x2={3} y2={12} stroke={stroke} strokeWidth="2.5" />
        </>
      ) : isU ? (
        <rect x={-22} y={-28} width={44} height={56} rx={3} fill="var(--raised)" stroke={stroke} strokeWidth="2" />
      ) : (
        <circle r={14} fill="none" stroke={stroke} strokeWidth="2" />
      )}
      <text x={0} y={isU ? -34 : -22} textAnchor="middle" fill="var(--accent-soft)" fontSize="11" fontFamily="monospace">{c.ref}</text>
      <text x={0} y={isU ? 40 : 30} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="monospace">{c.value}</text>
    </g>
  );
}
