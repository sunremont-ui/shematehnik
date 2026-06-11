import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { pinsOf, pinOffset, runDrc, computeNets, type PcbTrack } from "../project.ts";
import { routeOrthogonalEx, type Rect } from "../routing.ts";
import {
  boardRect, buildCopperGerber, buildDrill, buildEdgeGerber, buildSilkGerber, buildPnp, buildPour,
  clearanceDrc, PX_PER_MM, TRACK_W, PAD_HALF,
  type PadGeo, type TrackGeo, type Violation, type SilkFp,
} from "../pcb.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

type Pt = { x: number; y: number };

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
  const [clearMm, setClearMm] = useState(0.3);
  const [pourOn, setPourOn] = useState(false);
  const [pourNet, setPourNet] = useState("GND");
  const [drc, setDrc] = useState<{ floating: string[]; nets: number; viol: Violation[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const dragRef = useRef<{ sig: string; seg: number; horiz: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const board = boardRect(ucp.project.board);
  const tracks = ucp.project.tracks;

  // Посадочные места из общей модели; пады — на местах выводов (pinOffset).
  const fps = useMemo(() => ucp.project.components.map((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 95 + col * 130, y = 100 + row * 90;
    const pads = pinsOf(c.kind).map((pin) => {
      const o = pinOffset(c.kind, pin, c.rot);
      return { pin, x: x + o.dx * 0.7, y: y + o.dy * 0.9 };
    });
    return { ref: c.ref, kind: c.kind, x, y, pads };
  }), [ucp.project.components]);

  // Препятствия для роутера — bounding-box футпринтов.
  const obstacles = useMemo<Rect[]>(() => fps.map((f) => {
    const big = f.kind === "U";
    return { x0: f.x - (big ? 24 : 26), y0: f.y - (big ? 28 : 12), x1: f.x + (big ? 24 : 26), y1: f.y + (big ? 28 : 12) };
  }), [fps]);

  // Вывод → имя цепи (для DRC по зазорам и заливки).
  const netOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of computeNets(ucp.project)) for (const p of n.pins) m.set(p, n.name);
    return m;
  }, [ucp.project]);
  const netNames = useMemo(() => [...new Set(netOf.values())].sort(), [netOf]);

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
  type Link = (typeof links)[number];

  const liveSigs = useMemo(() => new Set(links.map((l) => l.sig)), [links]);
  const trackBySig = useMemo(() => new Map(tracks.map((t) => [t.sig, t])), [tracks]);

  // Геометрия для clearance-DRC и заливки (только дорожки живых проводов).
  const padsGeo = useMemo<PadGeo[]>(() => fps.flatMap((f) => f.pads.map((p) => ({
    id: `${f.ref}.${p.pin}`, x: p.x, y: p.y, half: PAD_HALF, net: netOf.get(`${f.ref}.${p.pin}`) ?? "",
  }))), [fps, netOf]);
  const tracksGeo = useMemo<TrackGeo[]>(() => tracks
    .filter((t) => liveSigs.has(t.sig))
    .map((t) => ({ sig: t.sig, layer: t.layer, points: t.points, net: netOf.get(t.sig.split("-")[0]) ?? "", w: TRACK_W })),
  [tracks, liveSigs, netOf]);

  const pour = useMemo(() => pourOn
    ? buildPour({ board, net: pourNet, tracks: tracksGeo, pads: padsGeo, clearancePx: clearMm * PX_PER_MM })
    : null, [pourOn, pourNet, board, tracksGeo, padsGeo, clearMm]);

  // --- разводка (A* с объездом футпринтов и уложенных дорожек) ---
  const bandsOf = (geo: { layer: string; points: Pt[] }[], layer: "F" | "B"): Rect[] =>
    geo.filter((t) => t.layer === layer).flatMap((t) => {
      const r: Rect[] = [];
      for (let i = 0; i + 1 < t.points.length; i++) {
        const p = t.points[i], q = t.points[i + 1], W = 4;
        r.push({ x0: Math.min(p.x, q.x) - W, y0: Math.min(p.y, q.y) - W, x1: Math.max(p.x, q.x) + W, y1: Math.max(p.y, q.y) + W });
      }
      return r;
    });

  const routeLink = (l: Link, placed: { layer: "F" | "B"; points: Pt[] }[]): PcbTrack => {
    const f = routeOrthogonalEx(l.s1, l.s2, [...obstacles, ...bandsOf(placed, "F")]);
    const layer: "F" | "B" = f.found ? "F" : "B";
    const r = f.found ? f : routeOrthogonalEx(l.s1, l.s2, [...obstacles, ...bandsOf(placed, "B")]);
    return { sig: l.sig, layer, points: [{ x: l.a.x, y: l.a.y }, ...r.path, { x: l.b.x, y: l.b.y }] };
  };

  const toggleRoute = (sig: string) => {
    if (trackBySig.has(sig)) { ucp.setTracks(tracks.filter((t) => t.sig !== sig)); if (selected === sig) setSelected(null); }
    else {
      const l = links.find((x) => x.sig === sig);
      if (l) ucp.setTracks([...tracks, routeLink(l, tracks)]);
    }
  };
  const routeAll = () => {
    const acc: PcbTrack[] = [];
    for (const l of links) acc.push(routeLink(l, acc));
    ucp.setTracks(acc);
    ucp.setStatus(`Routed ${acc.length} traces`);
  };
  const ripUp = () => { ucp.setTracks([]); setSelected(null); ucp.setStatus("Ripped up all traces"); };
  const deleteSelected = () => {
    if (!selected) return;
    ucp.setTracks(tracks.filter((t) => t.sig !== selected));
    setSelected(null);
    ucp.setStatus("Track deleted");
  };
  const rerouteSelected = () => {
    if (!selected) return;
    const l = links.find((x) => x.sig === selected);
    if (!l) return;
    const rest = tracks.filter((t) => t.sig !== selected);
    ucp.setTracks([...rest, routeLink(l, rest)]);
    ucp.setStatus("Track rerouted");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selected && !(e.target instanceof HTMLInputElement)) deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // --- перетаскивание сегмента выбранной дорожки (перпендикулярно) ---
  const sceneXY = (e: React.PointerEvent): Pt => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const onTrackDown = (e: React.PointerEvent, t: PcbTrack) => {
    e.stopPropagation();
    setSelected(t.sig);
    // ближайший внутренний сегмент (концы прибиты к падам)
    const p = sceneXY(e);
    let best = Infinity, seg = -1;
    for (let i = 1; i + 1 <= t.points.length - 2; i++) {
      const a = t.points[i], b = t.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1) continue;
      const tt = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)));
      const d = Math.hypot(p.x - (a.x + tt * (b.x - a.x)), p.y - (a.y + tt * (b.y - a.y)));
      if (d < best) { best = d; seg = i; }
    }
    if (seg >= 0 && best < 10) {
      const a = t.points[seg], b = t.points[seg + 1];
      dragRef.current = { sig: t.sig, seg, horiz: Math.abs(a.y - b.y) < 0.5 };
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  };
  const onSvgMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = sceneXY(e);
    const snap = (v: number) => Math.round(v / 2) * 2;
    ucp.setTracks(tracks.map((t) => {
      if (t.sig !== d.sig) return t;
      const pts = t.points.map((q, i) => {
        if (i !== d.seg && i !== d.seg + 1) return q;
        return d.horiz ? { x: q.x, y: snap(p.y) } : { x: snap(p.x), y: q.y };
      });
      return { ...t, points: pts };
    }));
  };
  const onSvgUp = () => { dragRef.current = null; };

  // --- DRC ---
  const runFullDrc = () => {
    const base = runDrc(ucp.project);
    const viol = clearanceDrc(tracksGeo, padsGeo, clearMm * PX_PER_MM);
    setDrc({ floating: base.floating, nets: base.nets, viol });
    ucp.setStatus(`DRC: ${viol.length} clearance, ${base.floating.length} floating`);
  };

  // --- фаб-экспорт ---
  const exportFab = () => {
    const n = ucp.projectName;
    const allPads = fps.flatMap((f) => f.pads);
    const fPaths = tracksGeo.filter((t) => t.layer === "F").map((t) => t.points);
    const bPaths = tracksGeo.filter((t) => t.layer === "B").map((t) => t.points);
    downloadText(`${n}-F_Cu.gbr`, buildCopperGerber({ pads: allPads, paths: fPaths, pour: pour ?? undefined }), "application/vnd.gerber");
    downloadText(`${n}-B_Cu.gbr`, buildCopperGerber({ pads: allPads, paths: bPaths }), "application/vnd.gerber");
    downloadText(`${n}-Edge_Cuts.gbr`, buildEdgeGerber(board), "application/vnd.gerber");
    const silk: SilkFp[] = fps.map((f, i) => {
      const o = obstacles[i];
      return { ...o, pin1: f.pads[0] ?? { x: f.x, y: f.y } };
    });
    downloadText(`${n}-F_Silkscreen.gbr`, buildSilkGerber(silk), "application/vnd.gerber");
    downloadText(`${n}.drl`, buildDrill(allPads), "text/plain");
    const comp = new Map(ucp.project.components.map((c) => [c.ref, c]));
    downloadText(`${n}-pos.csv`, buildPnp(fps.map((f) => {
      const c = comp.get(f.ref);
      return { ref: f.ref, value: c?.value ?? "", footprint: c?.footprint ?? f.kind, x: f.x, y: f.y, rot: c?.rot ?? 0 };
    }), board), "text/csv");
    ucp.setStatus(`Exported ${n}: F/B Cu, Edge, Silk, drill, pos.csv${pour ? " + pour" : ""}`);
  };

  const unrouted = links.filter((l) => !trackBySig.has(l.sig)).length;
  const mm = (v: number) => (v / PX_PER_MM).toFixed(2);

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <button className="btn" onClick={routeAll}>Route all</button>
          <button className="btn" onClick={ripUp}>Rip up</button>
          <button className="btn" onClick={runFullDrc}>Run DRC</button>
          <button className="btn primary" onClick={exportFab}>Export fab</button>
        </>
      } />
      <p className="panel-sub">
        Дорожки живут в модели (.ucp, undo/redo). Клик по связи — трассировать; клик по дорожке — выбрать,
        внутренний сегмент тянется перпендикулярно, Del — удалить.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 14 }}>
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

          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>BOARD, мм</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" min={20} max={200} value={ucp.project.board?.w ?? 90} style={{ width: 62 }}
              onChange={(e) => ucp.setBoard(Math.max(20, +e.target.value || 90), ucp.project.board?.h ?? 65)} />
            <span className="muted">×</span>
            <input type="number" min={20} max={200} value={ucp.project.board?.h ?? 65} style={{ width: 62 }}
              onChange={(e) => ucp.setBoard(ucp.project.board?.w ?? 90, Math.max(20, +e.target.value || 65))} />
          </div>

          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>CLEARANCE, мм</div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="range" min={0.1} max={1} step={0.05} value={clearMm} style={{ flex: 1 }}
              onChange={(e) => setClearMm(parseFloat(e.target.value))} />
            <span style={{ fontFamily: "monospace", fontSize: 12, width: 36, textAlign: "right" }}>{clearMm.toFixed(2)}</span>
          </label>

          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>COPPER POUR (F.Cu)</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={pourOn} onChange={() => setPourOn(!pourOn)} />
            <select value={pourNet} disabled={!pourOn} style={{ flex: 1 }} onChange={(e) => setPourNet(e.target.value)}>
              {[...new Set(["GND", ...netNames])].map((nn) => <option key={nn} value={nn}>{nn}</option>)}
            </select>
          </label>

          {selected && (
            <>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>TRACK</div>
              <div className="chip" title={selected}><span className="dot ok" />{selected.length > 20 ? selected.slice(0, 20) + "…" : selected}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" onClick={rerouteSelected}>Reroute</button>
                <button className="btn" onClick={deleteSelected}>Delete</button>
              </div>
            </>
          )}

          {drc && (
            <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
              <div className="chip"><span className={`dot ${drc.viol.length === 0 ? "ok" : "warn"}`} />{drc.viol.length} clearance</div>
              <div className="chip"><span className={`dot ${drc.floating.length === 0 ? "ok" : "warn"}`} />{drc.floating.length} floating · {drc.nets} nets</div>
              {drc.viol.slice(0, 6).map((v, i) => (
                <div key={i} className="muted" style={{ fontSize: 10.5, lineHeight: 1.4 }}>
                  <span className="tag">{v.kind}</span> {v.a} ↔ {v.b}: {mm(v.gap)} мм
                </div>
              ))}
              {drc.viol.length > 6 && <div className="muted" style={{ fontSize: 11 }}>+{drc.viol.length - 6}…</div>}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <svg ref={svgRef} width="100%" height="420" viewBox="0 0 440 340" style={{ background: "#0a0e0a", display: "block", touchAction: "none" }}
            onPointerMove={onSvgMove} onPointerUp={onSvgUp} onPointerDown={() => setSelected(null)}>
            {vis.Edge && <rect x={board.x0} y={board.y0} width={board.x1 - board.x0} height={board.y1 - board.y0}
              fill="none" stroke={LAYERS[3].color} strokeWidth="2" rx={6} />}
            {vis.FCu && pour && pour.map((r, i) => (
              <rect key={i} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="#c8343455" />
            ))}
            {links.map((l, i) => {
              const r = trackBySig.get(l.sig);
              if (r) {
                const onLayer = r.layer === "F" ? vis.FCu : vis.BCu;
                if (!onLayer) return null;
                const color = r.layer === "F" ? LAYERS[0].color : LAYERS[1].color;
                const sel = selected === l.sig;
                return (
                  <g key={i} style={{ cursor: "pointer" }} onPointerDown={(e) => onTrackDown(e, r)}>
                    {sel && <polyline points={r.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none" stroke="#ffffff" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity={0.45} />}
                    <polyline points={r.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                    {r.layer === "B" && [l.a, l.b].map((p, j) => (   // переходные отверстия
                      <circle key={j} cx={p.x} cy={p.y} r={3.5} fill="none" stroke="#d8d8d8" strokeWidth="1.5" />
                    ))}
                  </g>
                );
              }
              return ratsnest ? (
                <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="#3fb950" strokeWidth="1.5" strokeDasharray="3 3"
                  style={{ cursor: "pointer" }} onPointerDown={(e) => { e.stopPropagation(); toggleRoute(l.sig); }} />
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
            {drc?.viol.map((v, i) => (
              <g key={i}>
                <circle cx={v.x} cy={v.y} r={7} fill="none" stroke="#ff5544" strokeWidth="1.6" />
                <circle cx={v.x} cy={v.y} r={1.8} fill="#ff5544" />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
