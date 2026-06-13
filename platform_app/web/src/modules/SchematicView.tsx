import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import type { SchComponent, SchClipboard } from "../project.ts";
import { pinsOf, pinOffset, runDrc, runErc, findJunctions, buildClipboard, pasteClipboard } from "../project.ts";
import { getLibraryParts } from "../data/library.ts";
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
  const [selSet, setSelSet] = useState<Set<string>>(new Set());  // multi-select (ids)
  const [wireMode, setWireMode] = useState(false);
  const [labelMode, setLabelMode] = useState(false);
  const [erc, setErc] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ ref: string; pin: string } | null>(null);
  const [band, setBand] = useState<Rect | null>(null);          // рамка выделения
  const [editing, setEditing] = useState<{ id: string; field: "ref" | "value"; text: string } | null>(null);
  const labels = ucp.project.labels;
  const labelOf = (ref: string, pin: string) => labels.find((l) => l.ref === ref && l.pin === pin)?.net;
  const clipboard = useRef<SchClipboard | null>(null);
  const library = useMemo(() => getLibraryParts(ucp.userParts), [ucp.userParts]);

  // ERC: висящие выводы + типы пинов (конфликты выходов, питание).
  const floating = useMemo(() => new Set(runDrc(ucp.project).floating), [ucp.project]);
  const erc2 = useMemo(() => runErc(ucp.project), [ucp.project]);
  const conflictPins = useMemo(() => new Set(erc2.conflicts.flatMap((c) => c.pins)), [erc2]);
  const unpoweredPins = useMemo(() => new Set(erc2.unpowered), [erc2]);
  const junctions = useMemo(() => findJunctions(ucp.project), [ucp.project]);

  const obstacles = useMemo(() => comps.map(bboxOf), [comps]);
  const wirePaths = useMemo(() => wires.map((w) => {
    const a = comps.find((c) => c.ref === w.from.ref), b = comps.find((c) => c.ref === w.to.ref);
    return a && b ? routeWire(a, w.from.pin, b, w.to.pin, obstacles) : null;
  }), [wires, comps, obstacles]);
  const drag = useRef<{ start: { x: number; y: number }; items: { id: string; x: number; y: number }[] } | null>(null);
  const bandStart = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = comps.filter((c) => selSet.has(c.id));
  const primary = selected.length === 1 ? selected[0] : null;

  // Поворот выбранного клавишей R; Del — удалить выделение; Ctrl+C/V.
  const rotateSel = () => {
    if (!primary) return;
    ucp.updateComponent(primary.id, { rot: (((primary.rot ?? 0) + 90) % 360) }); ucp.markModified();
  };
  const deleteSel = () => {
    if (!selSet.size) return;
    ucp.removeComponents([...selSet]);
    setSelSet(new Set());
  };
  const copySel = () => {
    if (!selSet.size) return;
    clipboard.current = buildClipboard(ucp.project, new Set(selected.map((c) => c.ref)));
    ucp.setStatus(`Copied ${clipboard.current.components.length} components`);
  };
  const paste = () => {
    if (!clipboard.current?.components.length) return;
    const payload = pasteClipboard(ucp.project, clipboard.current, 2 * GRID);
    ucp.addItems(payload);
    setSelSet(new Set(payload.components.map((c) => c.id)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!svgRef.current || svgRef.current.getBoundingClientRect().width === 0) return; // вкладка скрыта
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && primary) { e.preventDefault(); rotateSel(); }
      else if (e.key === "Delete" && selSet.size) { e.preventDefault(); deleteSel(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "c" && selSet.size) { e.preventDefault(); copySel(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "v") { e.preventDefault(); paste(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPinClick(ref: string, pin: string) {
    if (!pending) { setPending({ ref, pin }); ucp.setStatus(`Wire from ${ref}.${pin}…`); return; }
    ucp.addWire(pending, { ref, pin });
    setPending(null);
  }

  // Перетаскивание: компонент (вся группа, если он в выделении) или рамка.
  function onCompDown(e: React.PointerEvent, comp: SchComponent) {
    if (wireMode || labelMode) return;
    e.stopPropagation();
    let ids: Set<string>;
    if (e.shiftKey) {
      ids = new Set(selSet);
      ids.has(comp.id) ? ids.delete(comp.id) : ids.add(comp.id);
      setSelSet(ids);
      return;                                   // shift-клик только меняет выделение
    }
    ids = selSet.has(comp.id) ? selSet : new Set([comp.id]);
    setSelSet(ids);
    const pt = toLocal(e);
    drag.current = {
      start: pt,
      items: comps.filter((c) => ids.has(c.id)).map((c) => ({ id: c.id, x: c.x, y: c.y })),
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onSvgDown(e: React.PointerEvent) {
    if (e.target !== svgRef.current && (e.target as Element).tagName !== "rect") return;
    if (wireMode || labelMode) return;
    const pt = toLocal(e);
    bandStart.current = pt;
    setBand({ x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y });
    svgRef.current?.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (drag.current) {
      const pt = toLocal(e);
      const dx = pt.x - drag.current.start.x, dy = pt.y - drag.current.start.y;
      for (const it of drag.current.items)
        ucp.updateComponent(it.id, { x: snap(it.x + dx), y: snap(it.y + dy) });
      return;
    }
    if (bandStart.current) {
      const pt = toLocal(e), s = bandStart.current;
      setBand({ x0: Math.min(s.x, pt.x), y0: Math.min(s.y, pt.y), x1: Math.max(s.x, pt.x), y1: Math.max(s.y, pt.y) });
    }
  }
  function onUp() {
    if (drag.current) { ucp.markModified(); drag.current = null; }
    if (bandStart.current && band) {
      const area = (band.x1 - band.x0) * (band.y1 - band.y0);
      if (area > 25) {
        const ids = comps.filter((c) => c.x >= band.x0 && c.x <= band.x1 && c.y >= band.y0 && c.y <= band.y1).map((c) => c.id);
        setSelSet(new Set(ids));
        if (ids.length) ucp.setStatus(`Selected ${ids.length}`);
      } else {
        setSelSet(new Set());                   // клик по пустому месту
      }
      bandStart.current = null;
      setBand(null);
    }
  }
  function toLocal(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Правка по месту (двойной клик по ref/value).
  function commitEdit() {
    if (!editing) return;
    const c = comps.find((x) => x.id === editing.id);
    const text = editing.text.trim();
    setEditing(null);
    if (!c || !text) return;
    if (editing.field === "ref") {
      if (text === c.ref || comps.some((x) => x.ref === text)) { ucp.setStatus(`Ref "${text}" занят`); return; }
      ucp.updateComponent(c.id, { ref: text });
    } else {
      ucp.updateComponent(c.id, { value: text });
    }
    ucp.markModified();
  }
  const editingComp = editing ? comps.find((c) => c.id === editing.id) : null;

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
          <button className={`btn${erc ? " primary" : ""}`} onClick={() => { setErc((e) => !e); ucp.setStatus(erc ? "ERC off" : `ERC: ${floating.size} floating, ${erc2.conflicts.length} conflicts, ${erc2.unpowered.length} unpowered`); }}>
            ERC{erc ? " ✓" : ""}
          </button>
          <span className="chip"><span className="dot ok" />{wires.length} wires</span>
          {erc && <>
            <span className="chip"><span className={`dot ${floating.size ? "warn" : "ok"}`} />{floating.size} floating</span>
            <span className="chip"><span className={`dot ${erc2.conflicts.length ? "warn" : "ok"}`} />{erc2.conflicts.length} out-conflict</span>
            <span className="chip"><span className={`dot ${erc2.unpowered.length ? "warn" : "ok"}`} />{erc2.unpowered.length} unpowered</span>
          </>}
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr 220px", gap: 12 }}>
        {/* Библиотека компонентов с поиском */}
        <div className="card" style={{ padding: 8, display: "flex", flexDirection: "column", maxHeight: 460 }}>
          <input placeholder="Search library…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 6 }} />
          <div style={{ overflowY: "auto", display: "grid", gap: 2 }}>
            {(() => {
              const q = query.trim().toLowerCase();
              const parts = library.filter((p) => !q || `${p.name} ${p.value} ${p.footprint} ${p.cat} ${p.desc}`.toLowerCase().includes(q));
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
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <svg ref={svgRef} width="100%" height="440" style={{ display: "block", background: "var(--base)", touchAction: "none" }}
            onPointerDown={onSvgDown} onPointerMove={onMove} onPointerUp={onUp}>
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
            {/* junction dots: выводы, где сходятся ≥2 провода */}
            {junctions.map((j, i) => {
              const c = comps.find((x) => x.ref === j.ref); if (!c) return null;
              const p = pinPos(c, j.pin);
              return <circle key={`j${i}`} cx={p.x} cy={p.y} r={3.2} fill="var(--accent-soft)" pointerEvents="none" />;
            })}
            {comps.map((c) => (
              <CompSym key={c.id} c={c} selected={selSet.has(c.id)}
                onPointerDown={(e) => onCompDown(e, c)}
                onEdit={(field) => setEditing({ id: c.id, field, text: field === "ref" ? c.ref : c.value })} />
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
            {/* ERC: висящие (красный), конфликт выходов (пурпурный), без питания (оранжевый) */}
            {erc && comps.flatMap((c) =>
              pinsOf(c.kind).flatMap((pin) => {
                const key = `${c.ref}.${pin}`;
                const marks: React.ReactNode[] = [];
                const p = pinPos(c, pin);
                if (floating.has(key)) marks.push(<circle key={`f-${key}`} cx={p.x} cy={p.y} r={7} fill="none" stroke="var(--danger)" strokeWidth="2" pointerEvents="none" />);
                if (conflictPins.has(key)) marks.push(<circle key={`c-${key}`} cx={p.x} cy={p.y} r={10} fill="none" stroke="#c678dd" strokeWidth="2" strokeDasharray="3 2" pointerEvents="none" />);
                if (unpoweredPins.has(key)) marks.push(<circle key={`u-${key}`} cx={p.x} cy={p.y} r={10} fill="none" stroke="#d29922" strokeWidth="2" pointerEvents="none" />);
                return marks;
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
            {/* рамка выделения */}
            {band && <rect x={band.x0} y={band.y0} width={band.x1 - band.x0} height={band.y1 - band.y0}
              fill="var(--accent)" opacity={0.12} stroke="var(--accent)" strokeDasharray="4 3" pointerEvents="none" />}
          </svg>
          {/* правка по месту (двойной клик) */}
          {editing && editingComp && (
            <input
              autoFocus
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); else if (e.key === "Escape") setEditing(null); }}
              style={{
                position: "absolute",
                left: editingComp.x - 45,
                top: editingComp.y + (editing.field === "ref" ? (editingComp.kind === "U" ? -48 : -36) : (editingComp.kind === "U" ? 28 : 18)),
                width: 90, textAlign: "center", fontFamily: "monospace", fontSize: 12, padding: "2px 4px",
              }}
            />
          )}
        </div>

        {/* Properties */}
        <div className="card">
          <div className="muted" style={{ marginBottom: 10, fontSize: 11 }}>
            PROPERTIES{selSet.size > 1 ? ` — ${selSet.size} SELECTED` : ""}
          </div>
          {primary ? (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field">Reference
                <input value={primary.ref} onChange={(e) => { ucp.updateComponent(primary.id, { ref: e.target.value }); ucp.markModified(); }} />
              </label>
              <label className="field">Value
                <input value={primary.value} onChange={(e) => { ucp.updateComponent(primary.id, { value: e.target.value }); ucp.markModified(); }} />
              </label>
              <div className="muted">Pos: {primary.x}, {primary.y} · {primary.rot ?? 0}°</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={rotateSel}>Rotate (R)</button>
                <button className="btn" onClick={deleteSel}>Delete</button>
              </div>
            </div>
          ) : selSet.size > 1 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div className="muted" style={{ fontSize: 12 }}>{selected.map((c) => c.ref).join(", ")}</div>
              <button className="btn" onClick={copySel}>Copy (Ctrl+C)</button>
              <button className="btn" onClick={deleteSel}>Delete (Del)</button>
            </div>
          ) : (
            <p className="muted">Клик/рамка — выбрать; Shift — добавить; двойной клик по подписи — править; Ctrl+C/V, Del.</p>
          )}
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

function CompSym({ c, selected, onPointerDown, onEdit }: {
  c: SchComponent; selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onEdit: (field: "ref" | "value") => void;
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
      <text x={0} y={isU ? -34 : -22} textAnchor="middle" fill="var(--accent-soft)" fontSize="11" fontFamily="monospace"
        style={{ cursor: "text" }} onDoubleClick={(e) => { e.stopPropagation(); onEdit("ref"); }}>{c.ref}</text>
      <text x={0} y={isU ? 40 : 30} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="monospace"
        style={{ cursor: "text" }} onDoubleClick={(e) => { e.stopPropagation(); onEdit("value"); }}>{c.value}</text>
    </g>
  );
}
