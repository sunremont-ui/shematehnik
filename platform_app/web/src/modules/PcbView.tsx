import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

const LAYERS = [
  { id: "FCu",   label: "F.Cu",      color: "#c83434" },
  { id: "BCu",   label: "B.Cu",      color: "#3457c8" },
  { id: "FSilkS",label: "F.SilkS",   color: "#d8d8d8" },
  { id: "Edge",  label: "Edge.Cuts", color: "#d2b04a" },
];

interface Pad { x: number; y: number; ref: string; }
const PADS: Pad[] = [
  { x: 90, y: 90, ref: "U1" }, { x: 150, y: 90, ref: "U1" },
  { x: 260, y: 110, ref: "R1" }, { x: 320, y: 110, ref: "R1" },
  { x: 260, y: 220, ref: "C1" }, { x: 320, y: 220, ref: "C1" },
  { x: 110, y: 250, ref: "J1" },
];
const TRACES = [[1, 2], [3, 4], [5, 6]];          // F.Cu routed
const RATS = [[0, 6], [2, 4], [1, 5]];            // unrouted airwires

export function PcbView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["pcb"];
  const [vis, setVis] = useState<Record<string, boolean>>({ FCu: true, BCu: true, FSilkS: true, Edge: true });
  const [ratsnest, setRatsnest] = useState(true);
  const [drc, setDrc] = useState<string | null>(null);

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={() => { setDrc(`DRC: ${ratsnest ? "3 unrouted nets" : "0 errors ✓"}`); ucp.setStatus(`DRC complete`); }}>Run DRC</button>
          <button className="btn primary" onClick={() => ucp.setStatus("Exported Gerber + drill files")}>Export Gerber</button>
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 14 }}>
        <div className="card" style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>LAYERS</div>
          {LAYERS.map((l) => (
            <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={vis[l.id]} onChange={() => setVis((v) => ({ ...v, [l.id]: !v[l.id] }))} />
              <span style={{ width: 12, height: 12, background: l.color, borderRadius: 2, display: "inline-block" }} />
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{l.label}</span>
            </label>
          ))}
          <div className="sep" style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={ratsnest} onChange={() => setRatsnest(!ratsnest)} />
            <span style={{ fontSize: 12 }}>Ratsnest</span>
          </label>
          {drc && <div className="chip" style={{ marginTop: 6 }}><span className={`dot ${drc.includes("0 errors") ? "ok" : "warn"}`} />{drc}</div>}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <svg width="100%" height="420" viewBox="0 0 440 340" style={{ background: "#0a0e0a", display: "block" }}>
            {vis.Edge && <rect x={40} y={40} width={360} height={260} fill="none" stroke={LAYERS[3].color} strokeWidth="2" rx={6} />}
            {vis.FCu && TRACES.map(([a, b], i) => (
              <line key={i} x1={PADS[a].x} y1={PADS[a].y} x2={PADS[b].x} y2={PADS[b].y} stroke={LAYERS[0].color} strokeWidth="4" strokeLinecap="round" />
            ))}
            {ratsnest && RATS.map(([a, b], i) => (
              <line key={i} x1={PADS[a].x} y1={PADS[a].y} x2={PADS[b].x} y2={PADS[b].y} stroke="#3fb950" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            {PADS.map((p, i) => (
              <g key={i}>
                <rect x={p.x - 7} y={p.y - 7} width={14} height={14} fill="#caa24a" rx={2} />
                <circle cx={p.x} cy={p.y} r={3} fill="#0a0e0a" />
                {vis.FSilkS && i % 2 === 0 && <text x={p.x} y={p.y - 12} textAnchor="middle" fill={LAYERS[2].color} fontFamily="monospace" fontSize="9">{p.ref}</text>}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
