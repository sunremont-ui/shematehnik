import { useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

const FACES: { t: string; bg: string }[] = [
  { t: "translateZ(70px)",                    bg: "rgba(56,139,253,.55)" },
  { t: "rotateY(180deg) translateZ(70px)",    bg: "rgba(56,139,253,.35)" },
  { t: "rotateY(90deg) translateZ(70px)",     bg: "rgba(88,166,255,.50)" },
  { t: "rotateY(-90deg) translateZ(70px)",    bg: "rgba(88,166,255,.30)" },
  { t: "rotateX(90deg) translateZ(70px)",     bg: "rgba(120,180,255,.60)" },
  { t: "rotateX(-90deg) translateZ(70px)",    bg: "rgba(40,100,200,.45)" },
];

export function ThreeDView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["threed"];
  const [rot, setRot] = useState({ x: -25, y: -35 });
  const [hole, setHole] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={() => { setHole(!hole); ucp.setStatus(hole ? "CSG: undo subtract" : "CSG subtract: hole bored"); }}>{hole ? "Union" : "Subtract"}</button>
          <button className="btn primary" onClick={() => ucp.setStatus("Exported enclosure.step (AP214)")}>Export STEP</button>
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 14 }}>
        <div className="card" style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", perspective: 800, cursor: "grab", userSelect: "none" }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => { if (!drag.current) return; setRot((r) => ({ x: r.x - (e.clientY - drag.current!.y) * 0.5, y: r.y + (e.clientX - drag.current!.x) * 0.5 })); drag.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={() => (drag.current = null)}>
          <div style={{ position: "relative", width: 140, height: 140, transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
            {FACES.map((f, i) => (
              <div key={i} style={{ position: "absolute", width: 140, height: 140, background: f.bg, border: "1px solid var(--accent-soft)", transform: f.t, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {hole && i === 0 && <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#0d1117", boxShadow: "inset 0 0 12px #000" }} />}
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>SCENE</div>
          <table className="tbl"><tbody>
            <tr><td>Primitive</td><td><code>Box 40×40×40</code></td></tr>
            <tr><td>Operation</td><td><code>{hole ? "subtract(∅16)" : "—"}</code></td></tr>
            <tr><td>Triangles</td><td><code>{hole ? 248 : 12}</code></td></tr>
          </tbody></table>
          <p className="muted" style={{ fontSize: 12 }}>ЛКМ — вращение. CSG без внешних библиотек (BSP-tree), экспорт STEP AP214 / STL.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Part Editor — примитивы + параметры
// ============================================================
interface Prim { id: number; kind: "box" | "cyl"; a: number; b: number; c: number; }
export function PartEditorView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["part"];
  const [prims, setPrims] = useState<Prim[]>([
    { id: 1, kind: "box", a: 40, b: 40, c: 8 },
    { id: 2, kind: "cyl", a: 6, b: 6, c: 20 },
  ]);
  const [sel, setSel] = useState(1);
  const nid = useRef(3);
  const cur = prims.find((p) => p.id === sel);

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={() => ucp.setStatus("Part exported (mesh)")}>Export</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14 }}>
        <div className="card" style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>PRIMITIVES</div>
          {prims.map((p) => (
            <div key={p.id} className={`tree-row${p.id === sel ? " active" : ""}`} style={{ borderRadius: 4 }} onClick={() => setSel(p.id)}>
              <span className="ico">{p.kind === "box" ? "▭" : "⬭"}</span><span className="lbl">{p.kind} #{p.id}</span>
            </div>
          ))}
          <button className="btn" onClick={() => { const id = nid.current++; setPrims((ps) => [...ps, { id, kind: "box", a: 20, b: 20, c: 20 }]); setSel(id); }}>+ Box</button>
          <button className="btn" onClick={() => { const id = nid.current++; setPrims((ps) => [...ps, { id, kind: "cyl", a: 10, b: 10, c: 20 }]); setSel(id); }}>+ Cylinder</button>
        </div>
        <div className="card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          {cur ? <>
            <div className="tag">{cur.kind} #{cur.id}</div>
            {(["a", "b", "c"] as const).map((k) => (
              <label key={k} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <span style={{ width: 60 }}>{cur.kind === "cyl" ? (k === "c" ? "Height" : "Radius") : ["Width", "Depth", "Height"][["a", "b", "c"].indexOf(k)]}</span>
                <input type="range" min={1} max={80} value={cur[k]} style={{ flex: 1 }} onChange={(e) => setPrims((ps) => ps.map((p) => p.id === cur.id ? { ...p, [k]: +e.target.value } : p))} />
                <span style={{ width: 40, textAlign: "right", fontFamily: "monospace" }}>{cur[k]}</span>
              </label>
            ))}
          </> : <p className="muted">Нет выбранного примитива.</p>}
        </div>
      </div>
    </div>
  );
}
