import { useMemo, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { pinsOf, pinOffset, runDrc } from "../project.ts";
import { routeOrthogonalEx, type Rect } from "../routing.ts";
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

// Excellon drill: отверстия падов (металлизированные, служат переходами).
function buildDrill(fps: { pads: Pt[] }[]): string {
  const mm = (px: number) => (px / 4).toFixed(3);
  const L: string[] = ["M48", "FMAT,2", "METRIC", "T1C0.800", "%", "G90", "T1"];
  for (const f of fps) for (const p of f.pads) L.push(`X${mm(p.x)}Y${mm(340 - p.y)}`);
  L.push("M30");
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

  // Препятствия для роутера — bounding-box футпринтов.
  const obstacles = useMemo<Rect[]>(() => fps.map((f) => {
    const big = f.kind === "U";
    return { x0: f.x - (big ? 24 : 26), y0: f.y - (big ? 28 : 12), x1: f.x + (big ? 24 : 26), y1: f.y + (big ? 28 : 12) };
  }), [fps]);

  // Связи (ratsnest) из проводов (.ucp): пады + точки выхода стабов + sig.
  const links = useMemo(() => {
    const fp = new Map(fps.map((f) => [f.ref, f]));
    return ucp.project.wires.flatMap((w) => {
      const fa = fp.get(w.from.ref), fb = fp.get(w.to.ref);
      const a = fa?.pads.find((p) => p.pin === w.from.pin);
      const b = fb?.pads.find((p) => p.pin === w.to.pin);
      if (!a || !b || !fa || !fb) return [];
      const adir = Math.sign(a.x - fa.x) || 1, bdir = Math.sign(b.x - fb.x) || 1;
      const s1 = { x: a.x + adir * 14, y: a.y }, s2 = { x: b.x + bdir * 14, y: b.y };
      return [{ a, b, s1, s2, sig: `${w.from.ref}.${w.from.pin}-${w.to.ref}.${w.to.pin}` }];
    });
  }, [fps, ucp.project.wires]);

  // Последовательная двухслойная разводка: дорожка идёт по F.Cu с объездом
  // футпринтов + уже уложенных F.Cu-дорожек; если пути нет — уходит на B.Cu
  // (пересекающиеся цепи разводятся на разных слоях через переходы).
  const routedPaths = useMemo(() => {
    const placedF: Rect[] = [], placedB: Rect[] = [];
    const bands = (path: Pt[], into: Rect[]) => {
      for (let i = 0; i + 1 < path.length; i++) {
        const p = path[i], q = path[i + 1], W = 4;
        into.push({ x0: Math.min(p.x, q.x) - W, y0: Math.min(p.y, q.y) - W, x1: Math.max(p.x, q.x) + W, y1: Math.max(p.y, q.y) + W });
      }
    };
    const m = new Map<string, { path: Pt[]; layer: "F" | "B" }>();
    for (const l of links) {
      if (!routed.has(l.sig)) continue;
      const f = routeOrthogonalEx(l.s1, l.s2, [...obstacles, ...placedF]);
      const layer: "F" | "B" = f.found ? "F" : "B";
      const r = f.found ? f : routeOrthogonalEx(l.s1, l.s2, [...obstacles, ...placedB]);
      const path = [{ x: l.a.x, y: l.a.y }, ...r.path, { x: l.b.x, y: l.b.y }];
      bands(path, layer === "F" ? placedF : placedB);
      m.set(l.sig, { path, layer });
    }
    return m;
  }, [links, obstacles, routed]);

  const unrouted = links.filter((l) => !routed.has(l.sig)).length;

  function toggleRoute(sig: string) {
    setRouted((s) => { const n = new Set(s); n.has(sig) ? n.delete(sig) : n.add(sig); return n; });
  }
  const routeAll = () => { setRouted(new Set(links.map((l) => l.sig))); ucp.setStatus(`Routed ${links.length} traces`); };
  const ripUp = () => { setRouted(new Set()); ucp.setStatus("Ripped up all traces"); };

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={routeAll}>Route all</button>
          <button className="btn" onClick={ripUp}>Rip up</button>
          <button className="btn" onClick={() => { const r = runDrc(ucp.project); setDrc(r); ucp.setStatus(`DRC: ${r.errors} errors, ${r.unrouted} unrouted`); }}>Run DRC</button>
          <button className="btn primary" onClick={() => {
            const f = [...routedPaths.values()].filter((r) => r.layer === "F").map((r) => r.path);
            const b = [...routedPaths.values()].filter((r) => r.layer === "B").map((r) => r.path);
            const n = ucp.projectName;
            downloadText(`${n}-F_Cu.gbr`, buildGerber(fps, f), "application/vnd.gerber");
            downloadText(`${n}-B_Cu.gbr`, buildGerber(fps, b), "application/vnd.gerber");
            downloadText(`${n}.drl`, buildDrill(fps), "text/plain");
            ucp.setStatus(`Exported ${n}: F_Cu (${f.length}) + B_Cu (${b.length}) + drill`);
          }}>Export fab</button>
        </>
      } />
      <p className="panel-sub">Посадочные места из модели ({fps.length}); разведено {links.length - unrouted}/{links.length} дорожек — клик по связи трассирует/распускает.</p>
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
            {links.map((l, i) => {
              const r = routedPaths.get(l.sig);
              if (r) {
                const onLayer = r.layer === "F" ? vis.FCu : vis.BCu;
                if (!onLayer) return null;
                const color = r.layer === "F" ? LAYERS[0].color : LAYERS[1].color;
                return (
                  <g key={i} style={{ cursor: "pointer" }} onClick={() => toggleRoute(l.sig)}>
                    <polyline points={r.path.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                    {r.layer === "B" && [l.a, l.b].map((p, j) => (   // переходные отверстия
                      <circle key={j} cx={p.x} cy={p.y} r={3.5} fill="none" stroke="#d8d8d8" strokeWidth="1.5" />
                    ))}
                  </g>
                );
              }
              return ratsnest ? (
                <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="#3fb950" strokeWidth="1.5" strokeDasharray="3 3"
                  style={{ cursor: "pointer" }} onClick={() => toggleRoute(l.sig)} />
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
