import { useMemo, useState } from "react";
import * as THREE from "three";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { csg, useCoreBackend, type CsgOp } from "../core/ucpCore.ts";
import { PanelHead } from "./common.tsx";
import { ThreeStage } from "../three/ThreeStage.tsx";
import { buildBoardGroup, groupTriangles } from "../three/board.ts";
import { stlBinary, stepAP214 } from "../three/exporters.ts";
import { downloadBlob, downloadText } from "../util.ts";

// ============================================================
// 3D Editor — настоящий WebGL-меш платы (three.js) + STL/STEP-экспорт.
// ============================================================
export function ThreeDView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["threed"];
  const comps = ucp.project.components;
  const [enclosure, setEnclosure] = useState(true);

  const group = useMemo(() => buildBoardGroup(comps, enclosure), [comps, enclosure]);
  const triCount = useMemo(() => groupTriangles(group).length / 9, [group]);

  function exportStl() {
    const tris = groupTriangles(group);
    downloadBlob(`${ucp.projectName}-board.stl`, stlBinary(tris), "model/stl");
    ucp.setStatus(`Exported ${ucp.projectName}-board.stl (${tris.length / 9} tris)`);
  }
  function exportStep() {
    const tris = groupTriangles(group);
    downloadText(`${ucp.projectName}-board.step`, stepAP214(tris, `${ucp.projectName}_board`), "model/step");
    ucp.setStatus(`Exported ${ucp.projectName}-board.step (AP214)`);
  }

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={() => { setEnclosure(!enclosure); ucp.setStatus(enclosure ? "Enclosure hidden" : "Enclosure shown"); }}>
            {enclosure ? "Hide enclosure" : "Show enclosure"}
          </button>
          <button className="btn" onClick={exportStl}>Export STL</button>
          <button className="btn primary" onClick={exportStep}>Export STEP</button>
        </>
      } />
      <p className="panel-sub">Реальный WebGL-меш (three.js) из общей модели — {comps.length} деталей. ЛКМ — орбита, колесо — зум.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ThreeStage object={group} height={420} />
        </div>
        <div className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>SCENE</div>
          <table className="tbl"><tbody>
            <tr><td>Parts</td><td><code>{comps.length}</code></td></tr>
            <tr><td>Triangles</td><td><code>{triCount}</code></td></tr>
            <tr><td>Board</td><td><code>2-layer FR4</code></td></tr>
            <tr><td>Enclosure</td><td><code>{enclosure ? "shown" : "hidden"}</code></td></tr>
          </tbody></table>
          <p className="muted" style={{ fontSize: 12 }}>Экспорт: бинарный STL + STEP AP214 (triangulated shell).</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Part Editor — настоящая CSG (BSP) в WASM-ядре, рендер three.js, STL.
// ============================================================
const OPS: { id: CsgOp; label: string }[] = [
  { id: 0, label: "Union" }, { id: 1, label: "Subtract" }, { id: 2, label: "Intersect" },
];

// Строит three-меш из плоского массива треугольников csg() (9/треуг.).
function trisToGroup(tris: number[]): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(Float32Array.from(tris), 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6c9bd6, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide })));
  return g;
}

export function PartEditorView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["part"];
  const backend = useCoreBackend();
  const [op, setOp] = useState<CsgOp>(1);
  const [bx, setBx] = useState(18);

  const boxA = useMemo(() => ({ c: [0, 0, 0] as [number, number, number], r: [24, 24, 24] as [number, number, number] }), []);
  const tris = useMemo(() => csg(op, boxA, { c: [bx - 6, bx - 6, 0], r: [bx, bx, 40] }), [op, bx, boxA, backend]);
  const triCount = tris.length / 9;
  const group = useMemo(() => trisToGroup(tris), [tris]);

  function exportStl() {
    downloadBlob("part.stl", stlBinary(tris), "model/stl");
    ucp.setStatus(`Exported part.stl (${triCount} tris)`);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip" title="вычислительное ядро">
          <span className={`dot ${backend === "wasm" ? "ok" : backend === "js" ? "warn" : ""}`} />engine: {backend}
        </span>
        <button className="btn primary" onClick={exportStl}>Export STL</button>
      </>} />
      <p className="panel-sub">Настоящая CSG (BSP-дерево) в WASM-ядре: Box A ∘ Box B, рендер three.js. ЛКМ — орбита.</p>
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
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ThreeStage object={group} height={380} />
        </div>
      </div>
    </div>
  );
}
