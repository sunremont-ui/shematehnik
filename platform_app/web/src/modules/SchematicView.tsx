import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import type { SchComponent } from "../project.ts";
import { pinsOf, pinOffset, runDrc } from "../project.ts";
import { LIBRARY } from "../data/library.ts";
import { routeOrthogonal, type Rect } from "../routing.ts";
import { PanelHead } from "./common.tsx";

// Bounding-box корпуса (без выводов) — препятствие для роутера.
function bboxOf(c: SchComponent): Rect {
  const isU = c.kind === "U";
  const w = isU ? 24 : c.kind === "R" ? 18 : 14;
  const h = isU ? 30 : c.kind === "C" ? 14 : 10;
  return { x0: c.x - w, y0: c.y - h, x1: c.x + w, y1: c.y + h };
}

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

// Положение вывода компонента в мировых координатах (с учётом поворота).
function pinPos(c: SchComponent, pin: string) {
  const { dx, dy } = pinOffset(c.kind, pin, c.rot);
  return { x: c.x + dx, y: c.y + dy };
}

export function SchematicView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["schematic"];
  const comps = ucp.project.components;        // ← общая модель проекта
  const wires = ucp.project.wires;
  const [sel, setSel] = useState<string | null>(null);
  const [wireMode, setWireMode] = useState(false);
  const [labelMode, setLabelMode] = useState(false);
  const [erc, setErc] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ ref: string; pin: string } | null>(null);
  const labels = ucp.project.labels;
  const labelOf = (ref: string, pin: string) => labels.find((l) => l.ref === ref && l.pin === pin)?.net;

  // ERC: множество висящих выводов (из общей модели через runDrc).
  const floating = useMemo(() => new Set(runDrc(ucp.project).floating), [ucp.project]);

  // Маршруты проводов с объездом корпусов (пересчёт при изменении модели).
  // Поворот выбранного компонента клавишей R (если вкладка видима и не ввод).
  const rotateSel = () => {
    const c = comps.find((x) => x.id === sel); if (!c) return;
    ucp.updateComponent(c.id, { rot: (((c.rot ?? 0) + 90) % 360) }); ucp.markModified();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey && sel) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        if (!svgRef.current || svgRef.current.getBoundingClientRect().width === 0) return; // вкладка скрыта
        e.preventDefault(); rotateSel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const obstacles = useMemo(() => comps.map(bboxOf), [comps]);
  const wirePaths = useMemo(() => wires.map((w) => {
    const a = comps.find((c) => c.ref === w.from.ref), b = comps.find((c) => c.ref === w.to.ref);
    return a && b ? routeWire(a, w.from.pin, b, w.to.pin, obstacles) : null;
  }), [wires, comps, obstacles]);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
          <button className={`btn${wireMode ? " primary" : ""}`} onClick={() => { setWireMode((w) => !w); setLabelMode(false); setPending(null); ucp.setStatus(wireMode ? "Select mode" : "Wire mode: click two pins"); }}>
            {wireMode ? "Wire ✓" : "Wire"}
          </button>
          <button className={`btn${labelMode ? " primary" : ""}`} onClick={() => { setLabelMode((m) => !m); setWireMode(false); ucp.setStatus(labelMode ? "Select mode" : "Label mode: click a pin to name its net"); }}>
            {labelMode ? "Label ✓" : "Label"}
          </button>
          <button className={`btn${erc ? " primary" : ""}`} onClick={() => { setErc((e) => !e); ucp.setStatus(erc ? "ERC off" : `ERC: ${floating.size} floating pins`); }}>
            ERC{erc ? " ✓" : ""}
          </button>
          <span className="chip"><span className="dot ok" />{wires.length} wires</span>
          {erc && <span className="chip"><span className={`dot ${floating.size ? "warn" : "ok"}`} />{floating.size} floating</span>}
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr 220px", gap: 12 }}>
        {/* Библиотека компонентов с поиском */}
        <div className="card" style={{ padding: 8, display: "flex", flexDirection: "column", maxHeight: 460 }}>
          <input placeholder="Search library…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 6 }} />
          <div style={{ overflowY: "auto", display: "grid", gap: 2 }}>
            {(() => {
              const q = query.trim().toLowerCase();
              const parts = LIBRARY.filter((p) => !q || `${p.name} ${p.value} ${p.footprint} ${p.cat}`.toLowerCase().includes(q));
              let lastCat = "";
              return parts.map((p) => {
                const head = p.cat !== lastCat ? (lastCat = p.cat) : null;
                return (
                  <div key={p.id}>
                    {head && <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px", margin: "6px 0 2px" }}>{head}</div>}
                    <button className="btn" style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                      title={`${p.desc} · ${p.footprint}`}
                      onClick={() => ucp.addComponent(p.kind, p.value, p.footprint)}>
                      <b>{p.kind}</b> {p.name} <span className="muted" style={{ fontSize: 10 }}>{p.value}</span>
                    </button>
                  </div>
                );
              });
            })()}
          </div>
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
            {/* реальные провода из модели (с объездом корпусов) */}
            {wirePaths.map((pts, i) => pts && (
              <polyline key={i} points={pts} fill="none" stroke="var(--accent-soft)" strokeWidth="2"
                style={{ cursor: wireMode ? "pointer" : "default" }}
                onClick={(e) => { if (wireMode) { e.stopPropagation(); ucp.removeWire(i); } }} />
            ))}
            {comps.map((c) => (
              <CompSym key={c.id} c={c} selected={c.id === sel}
                onPointerDown={(e) => { if (!wireMode && !labelMode) onDown(e, c); }} />
            ))}
            {/* net-метки на выводах */}
            {labels.map((l, i) => {
              const c = comps.find((x) => x.ref === l.ref); if (!c) return null;
              const p = pinPos(c, l.pin), dir = Math.sign(pinOffset(c.kind, l.pin).dx) || 1;
              return (
                <text key={i} x={p.x + dir * 10} y={p.y - 4} textAnchor={dir < 0 ? "end" : "start"}
                  fill="#d29922" fontSize="10" fontFamily="monospace">{l.net}</text>
              );
            })}
            {/* ERC: красные маркеры на висящих выводах */}
            {erc && comps.flatMap((c) =>
              pinsOf(c.kind).filter((pin) => floating.has(`${c.ref}.${pin}`)).map((pin) => {
                const p = pinPos(c, pin);
                return <circle key={`erc-${c.id}-${pin}`} cx={p.x} cy={p.y} r={7} fill="none" stroke="var(--danger)" strokeWidth="2" pointerEvents="none" />;
              }),
            )}
            {/* кликабельные выводы в режиме провода/метки */}
            {(wireMode || labelMode) && comps.flatMap((c) =>
              pinsOf(c.kind).map((pin) => {
                const p = pinPos(c, pin);
                const active = pending?.ref === c.ref && pending?.pin === pin;
                return (
                  <circle key={`${c.id}-${pin}`} cx={p.x} cy={p.y} r={6}
                    fill={active ? "var(--accent)" : "var(--panel)"} stroke={labelMode ? "#d29922" : "var(--accent-soft)"} strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (wireMode) { onPinClick(c.ref, pin); return; }
                      const net = window.prompt(`Net name for ${c.ref}.${pin} (empty to remove):`, labelOf(c.ref, pin) ?? "");
                      if (net !== null) ucp.setLabel(c.ref, pin, net.trim());
                    }} />
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
              <div className="muted">Pos: {selected.x}, {selected.y} · {selected.rot ?? 0}°</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={rotateSel}>Rotate (R)</button>
                <button className="btn" onClick={() => { ucp.removeComponent(selected.id); setSel(null); }}>Delete</button>
              </div>
            </div>
          ) : <p className="muted">Выберите компонент на схеме.</p>}
        </div>
      </div>
    </div>
  );
}

// Разводка провода: каждый вывод выходит наружу коротким стабом, затем
// ортогональный маршрут A* с объездом корпусов компонентов (obstacles).
function routeWire(a: SchComponent, ap: string, b: SchComponent, bp: string, obstacles: Rect[]): string {
  const p1 = pinPos(a, ap), p2 = pinPos(b, bp);
  // выход стаба — наружу по направлению вывода (с учётом поворота)
  const esc = (c: SchComponent, pin: string, p: { x: number; y: number }) => {
    const o = pinOffset(c.kind, pin, c.rot), l = Math.hypot(o.dx, o.dy) || 1;
    return { x: p.x + o.dx / l * 20, y: p.y + o.dy / l * 20 };
  };
  const mid = routeOrthogonal(esc(a, ap, p1), esc(b, bp, p2), obstacles);
  const raw = [p1, ...mid, p2];
  const out: { x: number; y: number }[] = [];
  for (const p of raw) { const last = out[out.length - 1]; if (!last || last.x !== p.x || last.y !== p.y) out.push(p); }
  return out.map((p) => `${p.x},${p.y}`).join(" ");
}

function CompSym({ c, selected, onPointerDown }: {
  c: SchComponent; selected: boolean; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const stroke = selected ? "var(--accent)" : "var(--text)";
  const isU = c.kind === "U";
  return (
    <g transform={`translate(${c.x},${c.y})`} style={{ cursor: "grab" }} onPointerDown={onPointerDown}>
      {/* символ и стабы — поворачиваются; подписи остаются прямыми */}
      <g transform={`rotate(${c.rot ?? 0})`}>
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
      </g>
      <text x={0} y={isU ? -34 : -22} textAnchor="middle" fill="var(--accent-soft)" fontSize="11" fontFamily="monospace">{c.ref}</text>
      <text x={0} y={isU ? 40 : 30} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="monospace">{c.value}</text>
    </g>
  );
}
