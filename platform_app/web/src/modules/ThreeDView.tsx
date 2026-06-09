import { useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import type { SchComponent } from "../project.ts";
import { csg, useCoreBackend, type CsgOp } from "../core/ucpCore.ts";
import { PanelHead } from "./common.tsx";

// Размер корпуса компонента по типу (в мировых единицах платы).
function bodyOf(kind: string) {
  if (kind === "U") return { w: 34, d: 34, h: 14, top: "#3a4a6a", side: "#26324a" };
  if (kind === "C") return { w: 16, d: 16, h: 16, top: "#6a5a2a", side: "#4a3e1c" };
  if (kind === "Q") return { w: 14, d: 18, h: 12, top: "#444", side: "#2c2c2c" };
  return { w: 22, d: 10, h: 8, top: "#7a7a7a", side: "#555" }; // R/L/D
}

type P3 = [number, number, number];
interface Face { pts: string; fill: string; stroke: string; key: number; }

export function ThreeDView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["threed"];
  const comps = ucp.project.components;
  const [yaw, setYaw] = useState(0.6);
  const [enclosure, setEnclosure] = useState(true);
  const drag = useRef<number | null>(null);

  const scene = useMemo(() => buildScene(comps, yaw, enclosure), [comps, yaw, enclosure]);

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={() => { setEnclosure(!enclosure); ucp.setStatus(enclosure ? "Enclosure hidden" : "Enclosure shown"); }}>
            {enclosure ? "Hide enclosure" : "Show enclosure"}
          </button>
          <button className="btn primary" onClick={() => ucp.setStatus(`Exported board.step (AP214, ${comps.length} parts)`)}>Export STEP</button>
        </>
      } />
      <p className="panel-sub">Плата с компонентами из общей модели — {comps.length} деталей из Schematic. ЛКМ — вращение.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 14 }}>
        <div className="card" style={{ padding: 0, cursor: "ew-resize", userSelect: "none" }}
          onPointerDown={(e) => { drag.current = e.clientX; (e.currentTarget as Element).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (drag.current == null) return; setYaw((y) => y + (e.clientX - drag.current!) * 0.01); drag.current = e.clientX; }}
          onPointerUp={() => (drag.current = null)}>
          <svg width="100%" height="420" viewBox="0 0 460 420" style={{ background: "#0a0e0a", display: "block" }}>
            {scene.map((f, i) => (
              <polygon key={i} points={f.pts} fill={f.fill} stroke={f.stroke} strokeWidth="1" strokeLinejoin="round" />
            ))}
          </svg>
        </div>
        <div className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>SCENE</div>
          <table className="tbl"><tbody>
            <tr><td>Parts</td><td><code>{comps.length}</code></td></tr>
            <tr><td>Board</td><td><code>2-layer FR4</code></td></tr>
            <tr><td>Enclosure</td><td><code>{enclosure ? "shown" : "hidden"}</code></td></tr>
          </tbody></table>
          <p className="muted" style={{ fontSize: 12 }}>Изометрический рендер. Экспорт STEP AP214 / STL.</p>
        </div>
      </div>
    </div>
  );
}

// Строим отсортированный painter's-order список граней сцены.
function buildScene(comps: SchComponent[], yaw: number, enclosure: boolean): Face[] {
  const SCALE = 0.62, CX = 230, CY = 235;
  // центрируем по схемным координатам
  const xs = comps.map((c) => c.x), ys = comps.map((c) => c.y);
  const minX = Math.min(120, ...xs) - 50, maxX = Math.max(360, ...xs) + 50;
  const minY = Math.min(80, ...ys) - 50, maxY = Math.max(300, ...ys) + 50;
  const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;

  const project = ([x, y, z]: P3): [number, number] => {
    const xr = x * Math.cos(yaw) - y * Math.sin(yaw);
    const yr = x * Math.sin(yaw) + y * Math.cos(yaw);
    return [(xr - yr) * 0.866 * SCALE + CX, (xr + yr) * 0.5 * SCALE - z * SCALE + CY];
  };
  const depth = ([x, y, z]: P3): number => {
    const xr = x * Math.cos(yaw) - y * Math.sin(yaw);
    const yr = x * Math.sin(yaw) + y * Math.cos(yaw);
    return xr + yr + z; // больше = ближе к камере
  };
  const w = (x: number, y: number, z: number): P3 => [x - bcx, y - bcy, z];
  const quad = (a: P3, b: P3, c: P3, d: P3, fill: string, stroke: string): Face => ({
    pts: [a, b, c, d].map(project).map((p) => p.join(",")).join(" "),
    fill, stroke,
    key: (depth(a) + depth(b) + depth(c) + depth(d)) / 4,
  });

  const faces: Face[] = [];
  // плата (top face FR4)
  faces.push(quad(w(minX, minY, 4), w(maxX, minY, 4), w(maxX, maxY, 4), w(minX, maxY, 4), "#15402a", "#3fb950"));
  // компоненты как коробки
  for (const c of comps) {
    const b = bodyOf(c.kind);
    const x0 = c.x - b.w / 2, x1 = c.x + b.w / 2, y0 = c.y - b.d / 2, y1 = c.y + b.d / 2, h = 4 + b.h;
    // 4 боковые грани + крышка
    faces.push(quad(w(x0, y0, 4), w(x1, y0, 4), w(x1, y0, h), w(x0, y0, h), b.side, "#111"));
    faces.push(quad(w(x1, y0, 4), w(x1, y1, 4), w(x1, y1, h), w(x1, y0, h), b.side, "#111"));
    faces.push(quad(w(x0, y1, 4), w(x1, y1, 4), w(x1, y1, h), w(x0, y1, h), b.side, "#111"));
    faces.push(quad(w(x0, y0, 4), w(x0, y1, 4), w(x0, y1, h), w(x0, y0, h), b.side, "#111"));
    faces.push(quad(w(x0, y0, h), w(x1, y0, h), w(x1, y1, h), w(x0, y1, h), b.top, "#111"));
  }
  // корпус (полупрозрачная крышка-рамка по периметру)
  if (enclosure) {
    const eh = 28;
    const wall = (a: P3, bb: P3) => faces.push(quad([a[0], a[1], 4], [bb[0], bb[1], 4], [bb[0], bb[1], eh], [a[0], a[1], eh], "rgba(120,160,220,0.12)", "rgba(120,160,220,0.4)"));
    wall(w(minX, minY, 0), w(maxX, minY, 0));
    wall(w(maxX, minY, 0), w(maxX, maxY, 0));
    wall(w(maxX, maxY, 0), w(minX, maxY, 0));
    wall(w(minX, maxY, 0), w(minX, minY, 0));
  }
  return faces.sort((a, b) => a.key - b.key); // far → near
}

// ============================================================
// Part Editor — настоящая CSG (BSP) над двумя коробками в WASM-ядре.
// ============================================================
const OPS: { id: CsgOp; label: string }[] = [
  { id: 0, label: "Union" }, { id: 1, label: "Subtract" }, { id: 2, label: "Intersect" },
];

export function PartEditorView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["part"];
  const backend = useCoreBackend();
  const [op, setOp] = useState<CsgOp>(1);
  const [bx, setBx] = useState(18);     // полуразмер второй коробки (резца)
  const [yaw, setYaw] = useState(0.6);
  const drag = useRef<number | null>(null);

  const boxA = useMemo(() => ({ c: [0, 0, 0] as [number, number, number], r: [24, 24, 24] as [number, number, number] }), []);
  const tris = useMemo(() => csg(op, boxA, { c: [bx - 6, bx - 6, 0], r: [bx, bx, 40] }), [op, bx, boxA, backend]);
  const triCount = tris.length / 9;

  const faces = useMemo(() => projectTris(tris, yaw), [tris, yaw]);

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip" title="вычислительное ядро">
          <span className={`dot ${backend === "wasm" ? "ok" : backend === "js" ? "warn" : ""}`} />engine: {backend}
        </span>
        <button className="btn primary" onClick={() => ucp.setStatus(`Exported part.stl (${triCount} tris)`)}>Export STL</button>
      </>} />
      <p className="panel-sub">Настоящая CSG (BSP-дерево) в WASM-ядре: Box A ∘ Box B. ЛКМ — вращение.</p>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14 }}>
        <div className="card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>OPERATION</div>
          <div className="toolbar" style={{ margin: 0 }}>
            {OPS.map((o) => (
              <button key={o.id} className={`btn${op === o.id ? " primary" : ""}`} onClick={() => { setOp(o.id); ucp.setStatus(`CSG: ${o.label.toLowerCase()}`); }}>{o.label}</button>
            ))}
          </div>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <span style={{ width: 70 }}>Cutter size</span>
            <input type="range" min={6} max={30} value={bx} style={{ flex: 1 }} onChange={(e) => setBx(+e.target.value)} />
            <span style={{ width: 32, textAlign: "right", fontFamily: "monospace" }}>{bx}</span>
          </label>
          <table className="tbl"><tbody>
            <tr><td>Box A</td><td><code>48³</code></td></tr>
            <tr><td>Box B</td><td><code>{bx * 2}×{bx * 2}×80</code></td></tr>
            <tr><td>Triangles</td><td><code>{triCount}</code></td></tr>
          </tbody></table>
        </div>
        <div className="card" style={{ padding: 0, cursor: "ew-resize", userSelect: "none" }}
          onPointerDown={(e) => { drag.current = e.clientX; (e.currentTarget as Element).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (drag.current == null) return; setYaw((y) => y + (e.clientX - drag.current!) * 0.01); drag.current = e.clientX; }}
          onPointerUp={() => (drag.current = null)}>
          <svg width="100%" height="380" viewBox="0 0 460 380" style={{ background: "#0a0e0a", display: "block" }}>
            {faces.map((f, i) => <polygon key={i} points={f.pts} fill={f.fill} stroke="#0a0e0a" strokeWidth="0.4" />)}
          </svg>
        </div>
      </div>
    </div>
  );
}

// Проекция треугольников (9 double каждый) в изометрию + painter's order + плоское освещение.
function projectTris(tris: number[], yaw: number) {
  const SCALE = 2.4, CX = 230, CY = 210;
  const rot = (x: number, y: number): [number, number] => [x * Math.cos(yaw) - y * Math.sin(yaw), x * Math.sin(yaw) + y * Math.cos(yaw)];
  const proj = (x: number, y: number, z: number): [number, number] => {
    const [xr, yr] = rot(x, y);
    return [(xr - yr) * 0.866 * SCALE + CX, (xr + yr) * 0.5 * SCALE - z * SCALE + CY];
  };
  const out: { pts: string; fill: string; key: number }[] = [];
  const light: [number, number, number] = [0.4, 0.5, 0.75];
  for (let i = 0; i + 8 < tris.length; i += 9) {
    const a: [number, number, number] = [tris[i], tris[i + 1], tris[i + 2]];
    const b: [number, number, number] = [tris[i + 3], tris[i + 4], tris[i + 5]];
    const c: [number, number, number] = [tris[i + 6], tris[i + 7], tris[i + 8]];
    // нормаль для плоского затенения
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const lum = Math.max(0.18, Math.abs(nx * light[0] + ny * light[1] + nz * light[2]));
    const shade = Math.round(70 + lum * 150);
    const fill = `rgb(${Math.round(shade * 0.55)},${Math.round(shade * 0.75)},${shade})`;
    const key = [a, b, c].reduce((s, p) => { const [xr, yr] = rot(p[0], p[1]); return s + xr + yr + p[2]; }, 0) / 3;
    out.push({ pts: [proj(...a), proj(...b), proj(...c)].map((p) => p.join(",")).join(" "), fill, key });
  }
  return out.sort((p, q) => p.key - q.key);
}
