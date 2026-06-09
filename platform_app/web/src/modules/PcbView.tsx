import { useMemo, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { pinsOf, pinOffset, runDrc } from "../project.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

// Минимальный RS-274X Gerber: контур платы (Edge.Cuts) + флэши падов (F.Cu).
function buildGerber(fps: { pads: { x: number; y: number }[] }[]): string {
  const k = (px: number) => Math.round((px / 4) * 10000); // px → mm(3.4)
  const L: string[] = ["%FSLAX34Y34*%", "%MOMM*%", "%ADD10C,1.50000*%", "%ADD11C,0.20000*%", "G01*"];
  // контур
  L.push("D11*");
  const oc: [number, number][] = [[40, 40], [400, 40], [400, 300], [40, 300], [40, 40]];
  oc.forEach(([x, y], i) => L.push(`X${k(x)}Y${k(340 - y)}D0${i === 0 ? 2 : 1}*`));
  // пады
  L.push("D10*");
  for (const f of fps) for (const p of f.pads) L.push(`X${k(p.x)}Y${k(340 - p.y)}D03*`);
  L.push("M02*");
  return L.join("\n");
}

const LAYERS = [
  { id: "FCu",   label: "F.Cu",      color: "#c83434" },
  { id: "BCu",   label: "B.Cu",      color: "#3457c8" },
  { id: "FSilkS",label: "F.SilkS",   color: "#d8d8d8" },
  { id: "Edge",  label: "Edge.Cuts", color: "#d2b04a" },
];

export function PcbView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["pcb"];
  const [vis, setVis] = useState<Record<string, boolean>>({ FCu: true, BCu: true, FSilkS: true, Edge: true });
  const [ratsnest, setRatsnest] = useState(true);
  const [drc, setDrc] = useState<ReturnType<typeof runDrc> | null>(null);

  // Посадочные места из общей модели; пады — на местах выводов (pinOffset).
  const fps = useMemo(() => ucp.project.components.map((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 95 + col * 130, y = 100 + row * 90;
    const pads = pinsOf(c.kind).map((pin) => {
      const o = pinOffset(c.kind, pin);
      return { pin, x: x + o.dx * 0.7, y: y + o.dy * 0.9 };
    });
    return { ref: c.ref, kind: c.kind, x, y, pads };
  }), [ucp.project.components]);

  // Ratsnest строится из реальных проводов (.ucp).
  const rats = useMemo(() => {
    const fp = new Map(fps.map((f) => [f.ref, f]));
    const pad = (ref: string, pin: string) => fp.get(ref)?.pads.find((p) => p.pin === pin) ?? null;
    return ucp.project.wires.flatMap((w) => {
      const a = pad(w.from.ref, w.from.pin), b = pad(w.to.ref, w.to.pin);
      return a && b ? [{ a, b }] : [];
    });
  }, [fps, ucp.project.wires]);
  const unrouted = rats.length;

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={() => { const r = runDrc(ucp.project); setDrc(r); ucp.setStatus(`DRC: ${r.errors} errors, ${r.unrouted} unrouted`); }}>Run DRC</button>
          <button className="btn primary" onClick={() => { downloadText(`${ucp.projectName}-F_Cu.gbr`, buildGerber(fps), "application/vnd.gerber"); ucp.setStatus(`Exported ${ucp.projectName}-F_Cu.gbr`); }}>Export Gerber</button>
        </>
      } />
      <p className="panel-sub">Посадочные места из общей модели проекта — {fps.length} компонентов из Schematic.</p>
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
          <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={ratsnest} onChange={() => setRatsnest(!ratsnest)} />
            <span style={{ fontSize: 12 }}>Ratsnest ({unrouted})</span>
          </label>
          {drc && (
            <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
              <div className="chip"><span className={`dot ${drc.errors === 0 ? "ok" : "warn"}`} />{drc.errors === 0 ? "0 errors ✓" : `${drc.errors} floating pins`}</div>
              <div className="chip"><span className={`dot ${drc.unrouted === 0 ? "ok" : "warn"}`} />{drc.unrouted} unrouted · {drc.nets} nets</div>
              {drc.floating.length > 0 && (
                <div className="muted" style={{ fontSize: 11, lineHeight: 1.6 }}>
                  floating: {drc.floating.slice(0, 8).map((p) => <span key={p} className="tag" style={{ marginRight: 3 }}>{p}</span>)}
                  {drc.floating.length > 8 && ` +${drc.floating.length - 8}`}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <svg width="100%" height="420" viewBox="0 0 440 340" style={{ background: "#0a0e0a", display: "block" }}>
            {vis.Edge && <rect x={40} y={40} width={360} height={260} fill="none" stroke={LAYERS[3].color} strokeWidth="2" rx={6} />}
            {ratsnest && rats.map((r, i) => (
              <line key={i} x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} stroke="#3fb950" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            {fps.map((f) => {
              const big = f.kind === "U";
              return (
              <g key={f.ref}>
                {vis.FCu && <rect x={f.x - (big ? 24 : 26)} y={f.y - (big ? 28 : 12)} width={big ? 48 : 52} height={big ? 56 : 24} rx={3} fill="none" stroke={LAYERS[0].color} strokeWidth="1.5" />}
                {f.pads.map((p) => (
                  <g key={p.pin}>
                    <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill="#caa24a" rx={2} />
                    <circle cx={p.x} cy={p.y} r={2} fill="#0a0e0a" />
                  </g>
                ))}
                {vis.FSilkS && <text x={f.x} y={f.y - (big ? 32 : 16)} textAnchor="middle" fill={LAYERS[2].color} fontFamily="monospace" fontSize="9">{f.ref}</text>}
              </g>
            ); })}
          </svg>
        </div>
      </div>
    </div>
  );
}
