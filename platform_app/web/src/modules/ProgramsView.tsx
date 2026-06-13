import { useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { fsm, fsmPresets, type FsmDesign, type FsmTransition } from "../design.ts";
import { genFsm } from "../codegen.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

const R = 34;

export function ProgramsView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["programs"];
  const design = fsm.use();
  const [mode, setMode] = useState<"select" | "link">("select");
  const [selected, setSelected] = useState<string | null>(design.initial);
  const [selectedTr, setSelectedTr] = useState<number | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [event, setEvent] = useState("EV_DONE");
  const [guard, setGuard] = useState("");
  const [action, setAction] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; x: number; y: number } | null>(null);
  const selectedState = design.states.find((s) => s.id === selected) ?? null;
  const currentTr = selectedTr != null ? design.transitions[selectedTr] : null;

  const update = (fn: (d: FsmDesign) => FsmDesign) => {
    fsm.update(fn);
    ucp.markModified();
  };

  const addState = () => {
    const id = `s${Date.now().toString(36)}`;
    update((d) => ({
      ...d,
      states: [...d.states, { id, name: `STATE_${d.states.length + 1}`, x: 180 + d.states.length * 30, y: 170 + d.states.length * 20 }],
      initial: d.initial || id,
    }));
    setSelected(id);
    setSelectedTr(null);
  };

  const deleteSelected = () => {
    if (selectedTr != null) {
      update((d) => ({ ...d, transitions: d.transitions.filter((_, i) => i !== selectedTr) }));
      setSelectedTr(null);
      return;
    }
    if (!selected) return;
    update((d) => {
      const states = d.states.filter((s) => s.id !== selected);
      return {
        ...d,
        states,
        transitions: d.transitions.filter((t) => t.from !== selected && t.to !== selected),
        initial: d.initial === selected ? states[0]?.id ?? "" : d.initial,
      };
    });
    setSelected(null);
  };

  const exportC = () => {
    const out = genFsm(design);
    downloadText("fsm.c", out.c, "text/x-c");
    downloadText("fsm.h", out.h, "text/x-c");
    ucp.setStatus(`Exported FSM C/H: ${design.states.length} states, ${design.transitions.length} transitions`);
  };

  function onNodeClick(id: string) {
    setSelected(id);
    setSelectedTr(null);
    if (mode !== "link") return;
    if (!pending) { setPending(id); ucp.setStatus(`Transition from ${stateName(design, id)}…`); return; }
    const tr: FsmTransition = {
      from: pending,
      to: id,
      event: event.trim() || "EV",
      ...(guard.trim() ? { guard: guard.trim() } : {}),
      ...(action.trim() ? { action: action.trim() } : {}),
    };
    update((d) => ({ ...d, transitions: [...d.transitions, tr] }));
    setPending(null);
    ucp.setStatus(`Transition ${stateName(design, tr.from)} → ${stateName(design, tr.to)}`);
  }

  function onDown(e: React.PointerEvent, id: string) {
    if (mode !== "select") return;
    e.stopPropagation();
    const s = design.states.find((x) => x.id === id); if (!s) return;
    const pt = local(e);
    drag.current = { id, sx: pt.x, sy: pt.y, x: s.x, y: s.y };
    setSelected(id);
    setSelectedTr(null);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const pt = local(e), d = drag.current;
    update((fsm) => ({
      ...fsm,
      states: fsm.states.map((s) => s.id === d.id ? { ...s, x: snap(d.x + pt.x - d.sx), y: snap(d.y + pt.y - d.sy) } : s),
    }));
  }

  function local(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className="dot ok" />{design.states.length} states · {design.transitions.length} transitions</span>
        <button className="btn primary" onClick={exportC}>Export C</button>
      </>} />
      <div className="toolbar">
        <button className="btn" onClick={addState}>Add State</button>
        <button className={`btn${mode === "link" ? " primary" : ""}`} onClick={() => { setMode(mode === "link" ? "select" : "link"); setPending(null); }}>
          {mode === "link" ? "Transition ✓" : "Transition"}
        </button>
        <button className="btn" disabled={!selected} onClick={() => selected && update((d) => ({ ...d, initial: selected }))}>Set Initial</button>
        <button className="btn" disabled={!selected && selectedTr == null} onClick={deleteSelected}>Delete</button>
        <select value="" onChange={(e) => {
          const p = fsmPresets[e.target.value]; if (!p) return;
          fsm.set(structuredClone(p));
          ucp.markModified(); ucp.setStatus(`FSM preset: ${p.name}`);
          setSelected(p.initial); setSelectedTr(null); setPending(null);
        }}>
          <option value="">Preset…</option>
          {Object.entries(fsmPresets).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
        </select>
        {mode === "link" && <span className="muted">{pending ? `from ${stateName(design, pending)}` : "click source state"}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <svg ref={svgRef} width="100%" height="420" style={{ display: "block", background: "var(--base)", touchAction: "none" }}
            onPointerMove={onMove} onPointerUp={() => { drag.current = null; }}>
            <defs>
              <marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-soft)" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="transparent" />
            {design.transitions.map((t, i) => (
              <Transition key={i} d={design} t={t} selected={selectedTr === i}
                onClick={(e) => { e.stopPropagation(); setSelectedTr(i); setSelected(null); }} />
            ))}
            {design.states.map((s) => {
              const isSel = selected === s.id;
              const isInitial = design.initial === s.id;
              const isPending = pending === s.id;
              return (
                <g key={s.id} transform={`translate(${s.x} ${s.y})`} style={{ cursor: mode === "select" ? "move" : "crosshair" }}
                  onPointerDown={(e) => onDown(e, s.id)}
                  onClick={(e) => { e.stopPropagation(); onNodeClick(s.id); }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const name = window.prompt("State name", s.name);
                    if (name?.trim()) update((d) => ({ ...d, states: d.states.map((x) => x.id === s.id ? { ...x, name: name.trim() } : x) }));
                  }}>
                  <circle r={R} fill="var(--raised)" stroke={isPending ? "#d29922" : isSel ? "var(--accent)" : "var(--text)"} strokeWidth={isSel || isPending ? 3 : 1.5} />
                  {isInitial && <circle r={R - 6} fill="none" stroke="var(--accent-soft)" strokeWidth={1.5} />}
                  <text y={4} textAnchor="middle" fill="var(--text)" fontFamily="monospace" fontSize="12">{s.name}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <label className="field">FSM name
            <input value={design.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} />
          </label>
          {selectedState && <>
            <div className="muted" style={{ fontSize: 11 }}>STATE</div>
            <label className="field">Name
              <input value={selectedState.name} onChange={(e) => update((d) => ({
                ...d, states: d.states.map((s) => s.id === selectedState.id ? { ...s, name: e.target.value } : s),
              }))} />
            </label>
            <label className="field">Entry code
              <textarea value={selectedState.entry ?? ""} rows={3} onChange={(e) => update((d) => ({
                ...d, states: d.states.map((s) => s.id === selectedState.id ? { ...s, entry: e.target.value } : s),
              }))} />
            </label>
          </>}
          {currentTr && <>
            <div className="muted" style={{ fontSize: 11 }}>TRANSITION</div>
            <label className="field">Event
              <input value={currentTr.event} onChange={(e) => patchTransition(selectedTr!, { event: e.target.value })} />
            </label>
            <label className="field">Guard
              <input value={currentTr.guard ?? ""} onChange={(e) => patchTransition(selectedTr!, { guard: e.target.value })} />
            </label>
            <label className="field">Action
              <textarea value={currentTr.action ?? ""} rows={3} onChange={(e) => patchTransition(selectedTr!, { action: e.target.value })} />
            </label>
          </>}
          <div className="muted" style={{ fontSize: 11 }}>NEW TRANSITION</div>
          <label className="field">Event<input value={event} onChange={(e) => setEvent(e.target.value)} /></label>
          <label className="field">Guard<input value={guard} onChange={(e) => setGuard(e.target.value)} /></label>
          <label className="field">Action<textarea rows={3} value={action} onChange={(e) => setAction(e.target.value)} /></label>
        </div>
      </div>
    </div>
  );

  function patchTransition(index: number, patch: Partial<FsmTransition>) {
    update((d) => ({ ...d, transitions: d.transitions.map((t, i) => i === index ? { ...t, ...patch } : t) }));
  }
}

function Transition({ d, t, selected, onClick }: {
  d: FsmDesign; t: FsmTransition; selected: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  const a = d.states.find((s) => s.id === t.from), b = d.states.find((s) => s.id === t.to);
  if (!a || !b) return null;
  const label = `${t.event}${t.guard ? ` [${t.guard}]` : ""}${t.action ? " / action" : ""}`;
  if (a.id === b.id) {
    return <g onClick={onClick} style={{ cursor: "pointer" }}>
      <path d={`M ${a.x + R * 0.3} ${a.y - R} C ${a.x + 88} ${a.y - 92}, ${a.x + 92} ${a.y + 4}, ${a.x + R} ${a.y + 4}`}
        fill="none" stroke={selected ? "var(--accent)" : "var(--accent-soft)"} strokeWidth={selected ? 3 : 2} markerEnd="url(#fsm-arrow)" />
      <text x={a.x + 72} y={a.y - 56} fill="var(--muted)" fontFamily="monospace" fontSize="10">{label}</text>
    </g>;
  }
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.max(1, Math.hypot(dx, dy));
  const x1 = a.x + (dx / len) * R, y1 = a.y + (dy / len) * R;
  const x2 = b.x - (dx / len) * R, y2 = b.y - (dy / len) * R;
  return <g onClick={onClick} style={{ cursor: "pointer" }}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={selected ? "var(--accent)" : "var(--accent-soft)"} strokeWidth={selected ? 3 : 2} markerEnd="url(#fsm-arrow)" />
    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fill="var(--muted)" fontFamily="monospace" fontSize="10">{label}</text>
  </g>;
}

function stateName(d: FsmDesign, id: string): string {
  return d.states.find((s) => s.id === id)?.name ?? id;
}

function snap(v: number): number {
  return Math.round(v / 10) * 10;
}
