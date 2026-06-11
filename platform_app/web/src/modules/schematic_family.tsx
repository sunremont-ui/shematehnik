import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { useCoreBackend } from "../core/ucpCore.ts";
import { computeNets, exportNetlist, exportBom } from "../project.ts";
import { buildNodes, buildElements, nodeLabel, transient, acSweep, dcSolve, type Elem } from "../spice.ts";
import { downloadText } from "../util.ts";

function EngineBadge({ backend }: { backend: string }) {
  return (
    <span className="chip" title="вычислительное ядро">
      <span className={`dot ${backend === "wasm" ? "ok" : backend === "js" ? "warn" : ""}`} />
      engine: {backend}
    </span>
  );
}

// ============================================================
// Symbol Editor — редактор УГО: символ + редактируемые пины
// ============================================================
interface Pin { id: number; name: string; num: string; side: "L" | "R"; }

export function SymbolEditorView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["symbol"];
  const [name, setName] = useState("OPAMP");
  const [pins, setPins] = useState<Pin[]>([
    { id: 1, name: "IN+", num: "3", side: "L" },
    { id: 2, name: "IN-", num: "2", side: "L" },
    { id: 3, name: "OUT", num: "6", side: "R" },
    { id: 4, name: "VCC", num: "7", side: "R" },
  ]);
  const nid = useRef(5);
  const left = pins.filter((p) => p.side === "L");
  const right = pins.filter((p) => p.side === "R");
  const rows = Math.max(left.length, right.length, 1);
  const bodyH = rows * 28 + 20;

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={() => ucp.setStatus(`Saved symbol ${name} (${pins.length} pins)`)}>Save symbol</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div className="card" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
          <svg width={360} height={bodyH + 60} style={{ background: "var(--base)" }}>
            <rect x={120} y={30} width={120} height={bodyH} fill="var(--raised)" stroke="var(--accent-soft)" strokeWidth="2" rx={4} />
            <text x={180} y={30 + bodyH / 2} textAnchor="middle" fill="var(--muted)" fontFamily="monospace" fontSize="13">{name}</text>
            {left.map((p, i) => {
              const y = 50 + i * 28;
              return <g key={p.id}>
                <line x1={70} y1={y} x2={120} y2={y} stroke="var(--text)" strokeWidth="2" />
                <circle cx={70} cy={y} r={3} fill="var(--accent)" />
                <text x={126} y={y + 4} fill="var(--text)" fontFamily="monospace" fontSize="11">{p.name}</text>
                <text x={66} y={y - 6} textAnchor="end" fill="var(--muted)" fontFamily="monospace" fontSize="10">{p.num}</text>
              </g>;
            })}
            {right.map((p, i) => {
              const y = 50 + i * 28;
              return <g key={p.id}>
                <line x1={240} y1={y} x2={290} y2={y} stroke="var(--text)" strokeWidth="2" />
                <circle cx={290} cy={y} r={3} fill="var(--accent)" />
                <text x={234} y={y + 4} textAnchor="end" fill="var(--text)" fontFamily="monospace" fontSize="11">{p.name}</text>
                <text x={294} y={y - 6} fill="var(--muted)" fontFamily="monospace" fontSize="10">{p.num}</text>
              </g>;
            })}
          </svg>
        </div>
        <div className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <label className="field">Symbol name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="muted" style={{ fontSize: 11 }}>PINS</div>
          {pins.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input style={{ width: 70 }} value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} />
              <input style={{ width: 44 }} value={p.num} onChange={(e) => patch(p.id, { num: e.target.value })} />
              <select value={p.side} onChange={(e) => patch(p.id, { side: e.target.value as "L" | "R" })}>
                <option value="L">L</option><option value="R">R</option>
              </select>
              <button className="btn" style={{ padding: "4px 8px" }} onClick={() => setPins((ps) => ps.filter((x) => x.id !== p.id))}>✕</button>
            </div>
          ))}
          <button className="btn" onClick={() => setPins((ps) => [...ps, { id: nid.current++, name: "NEW", num: "0", side: "L" }])}>+ Add pin</button>
        </div>
      </div>
    </div>
  );
  function patch(id: number, p: Partial<Pin>) { setPins((ps) => ps.map((x) => x.id === id ? { ...x, ...p } : x)); }
}

// ============================================================
// Wire Tool — демонстрация ортогональной разводки
// ============================================================
export function WireToolView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["wire"];
  const [mode, setMode] = useState<"hv" | "vh" | "diag">("hv");
  const A = { x: 80, y: 80 }, B = { x: 460, y: 280 };
  const path = mode === "hv" ? `${A.x},${A.y} ${B.x},${A.y} ${B.x},${B.y}`
    : mode === "vh" ? `${A.x},${A.y} ${A.x},${B.y} ${B.x},${B.y}`
    : `${A.x},${A.y} ${B.x},${B.y}`;
  return (
    <div>
      <PanelHead mod={mod} />
      <div className="toolbar">
        <span className="muted">Routing:</span>
        {(["hv", "vh", "diag"] as const).map((m) => (
          <button key={m} className={`btn${mode === m ? " primary" : ""}`} onClick={() => { setMode(m); ucp.setStatus(`Wire mode: ${m.toUpperCase()}`); }}>
            {m === "hv" ? "H→V" : m === "vh" ? "V→H" : "Direct"}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <svg width="100%" height="360" style={{ background: "var(--base)", display: "block" }}>
          <defs><pattern id="g2" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--border)" strokeWidth="0.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g2)" />
          <polyline points={path} fill="none" stroke="var(--accent-soft)" strokeWidth="2.5" />
          {[A, B].map((p, i) => <g key={i}>
            <rect x={p.x - 16} y={p.y - 10} width={32} height={20} rx={3} fill="var(--raised)" stroke="var(--text)" strokeWidth="1.5" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fill="var(--text)" fontFamily="monospace" fontSize="10">{i ? "C1" : "R1"}</text>
            <circle cx={p.x} cy={p.y} r={3} fill="var(--accent)" />
          </g>)}
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Netlist — список цепей
// ============================================================
export function NetlistView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["netlist"];
  const comps = ucp.project.components;

  // Цепи из общей модели: провода + net-метки (union-find в `computeNets`).
  const nets = useMemo(() => computeNets(ucp.project).map((n) => ({ net: n.name, nodes: n.pins })), [ucp.project]);

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className="dot ok" />{nets.length} nets · {comps.length} comps</span>
        <button className="btn" onClick={() => { downloadText(`${ucp.projectName}-bom.csv`, exportBom(ucp.project), "text/csv"); ucp.setStatus(`Exported ${ucp.projectName}-bom.csv`); }}>Export BOM</button>
        <button className="btn primary" onClick={() => { downloadText(`${ucp.projectName}.net`, exportNetlist(ucp.project)); ucp.setStatus(`Exported ${ucp.projectName}.net`); }}>Export netlist</button>
      </>} />
      <p className="panel-sub">Цепи из проводов и net-меток — обновляются вживую при правке Schematic.</p>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Net</th><th>Nodes</th><th>Count</th></tr></thead>
          <tbody>
            {nets.map((n) => (
              <tr key={n.net}><td><code>{n.net}</code></td><td>{n.nodes.map((x) => <span key={x} className="tag" style={{ marginRight: 4 }}>{x}</span>)}</td><td>{n.nodes.length}</td></tr>
            ))}
            {nets.length === 0 && <tr><td colSpan={3} className="muted">Нет цепей.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// SPICE — настоящий узловой анализатор по топологии схемы.
// DC / Transient / AC решаются MNA-движком (src/spice.ts) поверх реальных
// узлов проекта; источник возбуждения задаётся в панели (как .tran/.ac).
// ============================================================
type Mode = "dc" | "tran" | "ac";

export function SpiceView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["spice"];
  const backend = useCoreBackend();
  const cv = useRef<HTMLCanvasElement>(null);

  // Узлы и элементы из реальной модели проекта.
  const model = useMemo(() => {
    const nodes = buildNodes(ucp.project);
    const elems = buildElements(ucp.project, nodes);
    // степень узла = число выводов элементов, касающихся узла
    const deg = new Array(nodes.groups.length).fill(0);
    for (const e of elems) { deg[e.a]++; deg[e.b]++; }
    const touched = nodes.groups.filter((g) => deg[g.id] > 0).map((g) => g.id);
    return { nodes, elems, deg, touched };
  }, [ucp.project]);

  const { nodes, elems, deg, touched } = model;

  // Дефолтный выбор портов: junction (max degree) = probe, два degree-1 = in/gnd.
  const def = useMemo(() => {
    const junction = touched.slice().sort((a, b) => deg[b] - deg[a])[0] ?? 0;
    const ends = touched.filter((n) => deg[n] === 1);
    return { input: ends[0] ?? junction, ground: ends[1] ?? touched.find((n) => n !== junction) ?? 0, probe: junction };
  }, [touched, deg]);

  const [mode, setMode] = useState<Mode>("ac");
  const [input, setInput] = useState(def.input);
  const [ground, setGround] = useState(def.ground);
  const [probe, setProbe] = useState(def.probe);
  // стимул транзиента
  const [stim, setStim] = useState<"step" | "sine">("step");
  const [amp, setAmp] = useState(1);
  const [sfreq, setSfreq] = useState(100);
  const [tEnd, setTEnd] = useState(5);   // в мс
  // AC-свип
  const [f1, setF1] = useState(1), [f2, setF2] = useState(100000);

  // переинициализация портов при смене топологии
  useEffect(() => { setInput(def.input); setGround(def.ground); setProbe(def.probe); }, [def.input, def.ground, def.probe]);

  const opt = (id: number) => <option key={id} value={id}>{nodeLabel(nodes.groups[id])}</option>;
  const nodeOpts = nodes.groups.map((g) => opt(g.id));

  const ready = elems.length > 0 && input !== ground;

  // --- вычисления ---
  const dc = useMemo(() => ready && mode === "dc"
    ? dcSolve({ numNodes: nodes.groups.length, ground, input, vsrc: amp, elems })
    : null, [ready, mode, nodes.groups.length, ground, input, amp, elems]);

  const tran = useMemo(() => {
    if (!ready || mode !== "tran") return null;
    const tE = tEnd / 1000;
    const stimulus = stim === "step" ? () => amp : (t: number) => amp * Math.sin(2 * Math.PI * sfreq * t);
    return transient({ numNodes: nodes.groups.length, ground, input, stimulus, elems, tEnd: tE, steps: 600 });
  }, [ready, mode, tEnd, stim, amp, sfreq, ground, input, elems, nodes.groups.length]);

  const ac = useMemo(() => {
    if (!ready || mode !== "ac") return null;
    return acSweep({ numNodes: nodes.groups.length, ground, input, probe, elems, fStart: f1, fStop: f2, points: 200 });
  }, [ready, mode, f1, f2, ground, input, probe, elems, nodes.groups.length]);

  // --- отрисовка ---
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!, W = c.width, H = c.height;
    const css = getComputedStyle(document.documentElement);
    const col = (n: string) => css.getPropertyValue(n).trim();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = col("--border"); ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = (i / 4) * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (mode === "tran" && tran) {
      const all = nodes.groups.map((_, n) => tran.v[n]).flat();
      const vmax = Math.max(1e-6, ...all.map(Math.abs));
      const ty = (val: number) => H / 2 - (val / vmax) * (H * 0.42);
      const series: [number[], string][] = [[tran.v[input], col("--muted")], [tran.v[probe], col("--accent-soft")]];
      for (const [s, color] of series) {
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < s.length; i++) { const x = (i / (s.length - 1)) * W; i ? ctx.lineTo(x, ty(s[i])) : ctx.moveTo(x, ty(s[i])); }
        ctx.stroke();
      }
    } else if (mode === "ac" && ac) {
      const lo = Math.min(...ac.magDb), hi = Math.max(...ac.magDb, 0);
      const my = (db: number) => H * 0.1 + (1 - (db - lo) / Math.max(1e-6, hi - lo)) * H * 0.55;
      const py = (ph: number) => H * 0.7 + (1 - (ph + 180) / 360) * H * 0.25;
      ctx.strokeStyle = col("--accent-soft"); ctx.lineWidth = 2; ctx.beginPath();
      ac.magDb.forEach((db, i) => { const x = (i / (ac.magDb.length - 1)) * W; i ? ctx.lineTo(x, my(db)) : ctx.moveTo(x, my(db)); });
      ctx.stroke();
      ctx.strokeStyle = col("--muted"); ctx.lineWidth = 1.5; ctx.beginPath();
      ac.phaseDeg.forEach((ph, i) => { const x = (i / (ac.phaseDeg.length - 1)) * W; i ? ctx.lineTo(x, py(ph)) : ctx.moveTo(x, py(ph)); });
      ctx.stroke();
    } else {
      ctx.fillStyle = col("--muted"); ctx.font = "13px monospace";
      ctx.fillText(ready ? "DC operating point — см. таблицу" : "Нет R/C/L в схеме или input = ground", 16, H / 2);
    }
  }, [mode, tran, ac, ready, input, probe, nodes.groups]);

  function exportNet() {
    const lines = ["* UCP SPICE netlist (auto)",
      ...elems.map((e: Elem) => `${e.ref} N${e.a} N${e.b} ${e.value}`),
      `V1 N${input} N${ground} ${stim === "step" ? `DC ${amp}` : `SIN(0 ${amp} ${sfreq})`}`,
      mode === "ac" ? `.ac dec 200 ${f1} ${f2}` : mode === "tran" ? `.tran ${(tEnd / 1000 / 600).toExponential(2)} ${(tEnd / 1000)}` : ".op", ".end"];
    downloadText(`${ucp.projectName}.cir`, lines.join("\n"));
    ucp.setStatus(`Exported ${ucp.projectName}.cir`);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <EngineBadge backend={backend} />
        <span className="chip"><span className="dot ok" />{elems.length} R/C/L</span>
        <button className="btn" onClick={exportNet}>Export .cir</button>
      </>} />
      <p className="panel-sub">Узлы и номиналы — из реальной схемы. Источник возбуждения и анализ задаются ниже (как .op/.tran/.ac).</p>
      <div className="toolbar">
        <span className="muted">Analysis:</span>
        {(["dc", "tran", "ac"] as const).map((m) => (
          <button key={m} className={`btn${mode === m ? " primary" : ""}`} onClick={() => setMode(m)}>{m.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 10, display: "grid", gap: 8, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>PORTS</div>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <span style={{ width: 64 }}>Source +</span>
            <select value={input} onChange={(e) => setInput(+e.target.value)} style={{ flex: 1 }}>{nodeOpts}</select>
          </label>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <span style={{ width: 64 }}>Ground</span>
            <select value={ground} onChange={(e) => setGround(+e.target.value)} style={{ flex: 1 }}>{nodeOpts}</select>
          </label>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <span style={{ width: 64 }}>Probe</span>
            <select value={probe} onChange={(e) => setProbe(+e.target.value)} style={{ flex: 1 }}>{nodeOpts}</select>
          </label>

          {mode === "dc" && (
            <Slider l="Vsrc, В" v={amp} set={setAmp} min={0} max={12} step={0.5} />
          )}
          {mode === "tran" && <>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>STIMULUS</div>
            <div className="toolbar" style={{ margin: 0 }}>
              {(["step", "sine"] as const).map((s) => <button key={s} className={`btn${stim === s ? " primary" : ""}`} onClick={() => setStim(s)}>{s}</button>)}
            </div>
            <Slider l="Amp, В" v={amp} set={setAmp} min={0.5} max={10} step={0.5} />
            {stim === "sine" && <Slider l="f, Гц" v={sfreq} set={setSfreq} min={1} max={2000} step={1} />}
            <Slider l="t, мс" v={tEnd} set={setTEnd} min={1} max={50} step={1} />
          </>}
          {mode === "ac" && <>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>SWEEP</div>
            <Slider l="f₁, Гц" v={f1} set={setF1} min={1} max={1000} step={1} />
            <Slider l="f₂, Гц" v={f2} set={setF2} min={1000} max={1000000} step={1000} />
          </>}
        </div>
        <div className="card" style={{ padding: 12 }}>
          <canvas ref={cv} width={640} height={320} style={{ width: "100%", height: "auto" }} />
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            {mode === "tran" && <>
              <span className="chip"><span className="dot" style={{ background: "var(--muted)" }} />V(source)</span>
              <span className="chip"><span className="dot" style={{ background: "var(--accent-soft)" }} />V(probe)</span>
            </>}
            {mode === "ac" && <>
              <span className="chip"><span className="dot" style={{ background: "var(--accent-soft)" }} />|H| дБ</span>
              <span className="chip"><span className="dot" style={{ background: "var(--muted)" }} />phase °</span>
            </>}
            {mode === "dc" && dc && (
              <table className="tbl" style={{ width: "100%" }}><tbody>
                {touched.map((n) => <tr key={n}><td>{nodeLabel(nodes.groups[n])}</td><td><code>{dc[n].toFixed(4)} В</code></td></tr>)}
              </tbody></table>
            )}
            {mode === "ac" && ac && (() => {
              const i3 = ac.magDb.findIndex((d) => d <= ac.magDb[0] - 3);
              return <span className="muted" style={{ fontSize: 12 }}>{i3 > 0 ? `f(-3дБ) ≈ ${ac.f[i3].toFixed(1)} Гц` : "—"}</span>;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Маленький слайдер-параметр (label + range + значение).
function Slider({ l, v, set, min, max, step }: { l: string; v: number; set: (n: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <span style={{ width: 56 }}>{l}</span>
      <input type="range" min={min} max={max} step={step} value={v} style={{ flex: 1 }} onChange={(e) => set(parseFloat(e.target.value))} />
      <span style={{ width: 56, textAlign: "right", fontFamily: "monospace" }}>{v}</span>
    </label>
  );
}
