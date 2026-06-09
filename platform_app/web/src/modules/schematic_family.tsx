import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { connectedComponents, rcLowpass, useCoreBackend } from "../core/ucpCore.ts";

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
  const backend = useCoreBackend();
  const comps = ucp.project.components;

  // Цепи выводятся из общей модели: последовательная цепочка
  // comp[i].2 ↔ comp[i+1].1 (демо-связность). union-find считает ядро.
  const nets = useMemo(() => {
    const pins = comps.flatMap((c) => [`${c.ref}.1`, `${c.ref}.2`]);
    const idx = new Map(pins.map((p, i) => [p, i]));
    const edges: number[] = [];
    for (let i = 0; i + 1 < comps.length; i++) {
      edges.push(idx.get(`${comps[i].ref}.2`)!, idx.get(`${comps[i + 1].ref}.1`)!);
    }
    if (pins.length === 0) return [];
    const labels = connectedComponents(pins.length, edges); // ← ядро (WASM/JS)
    const groups = new Map<number, string[]>();
    labels.forEach((id, i) => {
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(pins[i]);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, nodes], i) => ({ net: `N$${i + 1}`, nodes }));
  }, [comps, backend]);

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <EngineBadge backend={backend} />
        <span className="chip"><span className="dot ok" />{nets.length} nets · {comps.length} comps</span>
      </>} />
      <p className="panel-sub">Цепи выведены из общей модели проекта — добавьте/удалите компонент в Schematic и список обновится.</p>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Net</th><th>Nodes</th><th>Count</th></tr></thead>
          <tbody>
            {nets.map((n) => (
              <tr key={n.net}><td><code>{n.net}</code></td><td>{n.nodes.map((x) => <span key={x} className="tag" style={{ marginRight: 4 }}>{x}</span>)}</td><td>{n.nodes.length}</td></tr>
            ))}
            {nets.length === 0 && <tr><td colSpan={3} className="muted">Нет компонентов.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// SPICE — симулятор с осциллограммой
// ============================================================
export function SpiceView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["spice"];
  const backend = useCoreBackend();
  const [r, setR] = useState(1000);     // Ом
  const [cuf, setCuf] = useState(200);  // мкФ
  const [freq, setFreq] = useState(2);  // Гц
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const cv = useRef<HTMLCanvasElement>(null);

  const netlist =
    `* RC low-pass\nV1 in 0 SIN(0 1 ${freq})\nR1 in out ${r}\nC1 out 0 ${cuf}u\n.tran 2.5m 1\n.end`;

  // V(out) считает ядро (RC-транзиент, Эйлер); V(in) — опорный синус.
  const data = useMemo(() => {
    const N = 400, tEnd = 1;
    const vout = rcLowpass(r, cuf * 1e-6, 1, freq, tEnd, N); // ← ядро (WASM/JS)
    const pts: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * tEnd;
      pts.push([Math.sin(2 * Math.PI * freq * t), vout[i]]);
    }
    return pts;
  }, [r, cuf, freq, backend]);

  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!, W = c.width, H = c.height, mid = H / 2;
    const css = getComputedStyle(document.documentElement);
    const col = (n: string) => css.getPropertyValue(n).trim();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = col("--border"); ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    const visN = running ? Math.min(data.length, Math.floor(phase)) : data.length;
    const draw = (idx: 0 | 1, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < visN; i++) { const x = (i / data.length) * W, y = mid - data[i][idx] * (H * 0.4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    };
    draw(0, col("--muted")); draw(1, col("--accent-soft"));
  }, [data, phase, running]);

  useEffect(() => {
    if (!running) return;
    let raf = 0, p = 0;
    const tick = () => { p += 8; setPhase(p); if (p < data.length) raf = requestAnimationFrame(tick); else { setRunning(false); ucp.setStatus("SPICE: transient done"); } };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, data.length, ucp]);

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <EngineBadge backend={backend} />
        <button className="btn primary" onClick={() => { setPhase(0); setRunning(true); ucp.setStatus("ngspice: running .tran"); }}>▶ Run</button>
      </>} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 10, display: "grid", gap: 10 }}>
          <div className="muted" style={{ fontSize: 11 }}>NETLIST</div>
          <textarea rows={6} value={netlist} readOnly style={{ width: "100%" }} />
          <div className="muted" style={{ fontSize: 11 }}>PARAMETERS</div>
          {[
            { l: "R, Ом", v: r, set: setR, min: 100, max: 5000, step: 100 },
            { l: "C, мкФ", v: cuf, set: setCuf, min: 10, max: 1000, step: 10 },
            { l: "f, Гц", v: freq, set: setFreq, min: 0.5, max: 10, step: 0.5 },
          ].map((p) => (
            <label key={p.l} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <span style={{ width: 56 }}>{p.l}</span>
              <input type="range" min={p.min} max={p.max} step={p.step} value={p.v} style={{ flex: 1 }}
                onChange={(e) => p.set(parseFloat(e.target.value))} />
              <span style={{ width: 44, textAlign: "right", fontFamily: "monospace" }}>{p.v}</span>
            </label>
          ))}
          <div className="muted" style={{ fontSize: 11 }}>fc ≈ {(1 / (2 * Math.PI * r * cuf * 1e-6)).toFixed(2)} Гц</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <canvas ref={cv} width={640} height={320} style={{ width: "100%", height: "auto" }} />
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span className="chip"><span className="dot" style={{ background: "var(--muted)" }} />V(in)</span>
            <span className="chip"><span className="dot" style={{ background: "var(--accent-soft)" }} />V(out)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
