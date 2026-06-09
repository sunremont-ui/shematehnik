import { useMemo, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { pinsOf, pinOffset, runDrc } from "../project.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

// Минимальный RS-274X Gerber: контур + флэши падов + разведённые дорожки (F.Cu).
type Pt = { x: number; y: number };
function buildGerber(fps: { pads: Pt[] }[], paths: Pt[][] = []): string {
  const k = (px: number) => Math.round((px / 4) * 10000); // px → mm(3.4)
  const Y = (py: number) => k(340 - py);
  const L: string[] = ["%FSLAX34Y34*%", "%MOMM*%", "%ADD10C,1.50000*%", "%ADD11C,0.20000*%", "%ADD12C,0.30000*%", "G01*"];
  // контур (D11)
  L.push("D11*");
  const oc: [number, number][] = [[40, 40], [400, 40], [400, 300], [40, 300], [40, 40]];
  oc.forEach(([x, y], i) => L.push(`X${k(x)}Y${Y(y)}D0${i === 0 ? 2 : 1}*`));
  // дорожки (D12) — Manhattan-маршрут
  if (paths.length) {
    L.push("D12*");
    for (const path of paths)
      path.forEach((p, i) => L.push(`X${k(p.x)}Y${Y(p.y)}D0${i === 0 ? 2 : 1}*`));
  }
  // пады (D10)
  L.push("D10*");
  for (const f of fps) for (const p of f.pads) L.push(`X${k(p.x)}Y${Y(p.y)}D03*`);
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
  const [routed, setRouted] = useState<Set<string>>(new Set()); // сигнатуры разведённых проводов

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

  // Ratsnest строится из реальных проводов (.ucp); sig — устойчивый ключ связи.
  // path — Manhattan-маршрут дорожки: выход из пада наружу + канал ниже
  // футпринтов, чтобы дорожка не пересекала корпуса компонентов.
  const rats = useMemo(() => {
    const fp = new Map(fps.map((f) => [f.ref, f]));
    return ucp.project.wires.flatMap((w) => {
      const fa = fp.get(w.from.ref), fb = fp.get(w.to.ref);
      const a = fa?.pads.find((p) => p.pin === w.from.pin);
      const b = fb?.pads.find((p) => p.pin === w.to.pin);
      if (!a || !b || !fa || !fb) return [];
      const adir = Math.sign(a.x - fa.x) || 1;   // выход из пада наружу от центра футпринта
      const bdir = Math.sign(b.x - fb.x) || 1;
      const chY = Math.max(a.y, b.y) + 40;        // канал ниже обоих футпринтов
      const ax = a.x + adir * 14, bx = b.x + bdir * 14;
      const path = [a, { x: ax, y: a.y }, { x: ax, y: chY }, { x: bx, y: chY }, { x: bx, y: b.y }, b];
      const sig = `${w.from.ref}.${w.from.pin}-${w.to.ref}.${w.to.pin}`;
      return [{ a, b, sig, path }];
    });
  }, [fps, ucp.project.wires]);
  const unrouted = rats.filter((r) => !routed.has(r.sig)).length;

  function toggleRoute(sig: string) {
    setRouted((s) => { const n = new Set(s); n.has(sig) ? n.delete(sig) : n.add(sig); return n; });
  }
  const routeAll = () => { setRouted(new Set(rats.map((r) => r.sig))); ucp.setStatus(`Routed ${rats.length} traces`); };
  const ripUp = () => { setRouted(new Set()); ucp.setStatus("Ripped up all traces"); };

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={routeAll}>Route all</button>
          <button className="btn" onClick={ripUp}>Rip up</button>
          <button className="btn" onClick={() => { const r = runDrc(ucp.project); setDrc(r); ucp.setStatus(`DRC: ${r.errors} errors, ${r.unrouted} unrouted`); }}>Run DRC</button>
          <button className="btn primary" onClick={() => { const tr = rats.filter((r) => routed.has(r.sig)); downloadText(`${ucp.projectName}-F_Cu.gbr`, buildGerber(fps, tr.map((r) => r.path)), "application/vnd.gerber"); ucp.setStatus(`Exported ${ucp.projectName}-F_Cu.gbr (${tr.length} traces)`); }}>Export Gerber</button>
        </>
      } />
      <p className="panel-sub">Посадочные места из модели ({fps.length}); разведено {rats.length - unrouted}/{rats.length} дорожек — клик по связи трассирует/распускает.</p>
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
            {rats.map((r, i) => {
              const isRouted = routed.has(r.sig);
              if (isRouted) {
                if (!vis.FCu) return null;
                return (
                  <polyline key={i} points={r.path.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none" stroke={LAYERS[0].color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"
                    style={{ cursor: "pointer" }} onClick={() => toggleRoute(r.sig)} />
                );
              }
              return ratsnest ? (
                <line key={i} x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} stroke="#3fb950" strokeWidth="1.5" strokeDasharray="3 3"
                  style={{ cursor: "pointer" }} onClick={() => toggleRoute(r.sig)} />
              ) : null;
            })}
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
