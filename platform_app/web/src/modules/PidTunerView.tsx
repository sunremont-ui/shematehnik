import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

// Дискретная симуляция ПИД + объект первого порядка с задержкой.
function simulate(kp: number, ki: number, kd: number, setpoint: number, steps = 200) {
  const dt = 0.1, tau = 2.0, gain = 1.0;
  let y = 0, integral = 0, prevErr = 0, u = 0;
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const err = setpoint - y;
    integral += err * dt;
    const deriv = (err - prevErr) / dt;
    u = kp * err + ki * integral + kd * deriv;
    u = Math.max(-200, Math.min(200, u));
    prevErr = err;
    // plant: tau*y' + y = gain*u
    y += (dt / tau) * (gain * u - y);
    out.push(y);
  }
  return out;
}

export function PidTunerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["pid"];
  const [kp, setKp] = useState(2.0);
  const [ki, setKi] = useState(0.5);
  const [kd, setKd] = useState(0.1);
  const setpoint = 100;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = useMemo(() => simulate(kp, ki, kd, setpoint), [kp, ki, kd]);

  const metrics = useMemo(() => {
    const peak = Math.max(...data);
    const overshoot = Math.max(0, ((peak - setpoint) / setpoint) * 100);
    let settle = data.length;
    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i] - setpoint) > setpoint * 0.02) { settle = i + 1; break; }
    }
    return { overshoot, settle: (settle * 0.1).toFixed(1) };
  }, [data]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, pad = 30;
    const css = getComputedStyle(document.documentElement);
    const c = (n: string) => css.getPropertyValue(n).trim();
    ctx.clearRect(0, 0, W, H);
    // axes
    ctx.strokeStyle = c("--border"); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
    // setpoint
    const ymax = setpoint * 1.6;
    const yScreen = (v: number) => H - pad - (v / ymax) * (H - 2 * pad);
    const xScreen = (i: number) => pad + (i / (data.length - 1)) * (W - 2 * pad);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = c("--muted");
    ctx.beginPath(); ctx.moveTo(pad, yScreen(setpoint)); ctx.lineTo(W - pad, yScreen(setpoint)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c("--muted"); ctx.font = "10px monospace";
    ctx.fillText(`SP=${setpoint}`, W - pad - 46, yScreen(setpoint) - 4);
    // response
    ctx.strokeStyle = c("--accent-soft"); ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => { const x = xScreen(i), y = yScreen(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }, [data]);

  function row(label: string, val: number, set: (n: number) => void, max: number, step: number) {
    return (
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <span style={{ width: 28, color: "var(--accent-soft)", fontFamily: "monospace" }}>{label}</span>
        <input type="range" min={0} max={max} step={step} value={val} style={{ flex: 1 }}
          onChange={(e) => { set(parseFloat(e.target.value)); ucp.markModified(); }} />
        <span style={{ width: 44, textAlign: "right", fontFamily: "monospace" }}>{val.toFixed(2)}</span>
      </label>
    );
  }

  return (
    <div>
      <PanelHead mod={mod} right={
        <button className="btn primary" onClick={() => ucp.setStatus(`PID exported: Kp=${kp} Ki=${ki} Kd=${kd}`)}>
          Export coefficients
        </button>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        <div className="card" style={{ padding: 12 }}>
          <canvas ref={canvasRef} width={640} height={360} style={{ width: "100%", height: "auto" }} />
        </div>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="card" style={{ display: "grid", gap: 14 }}>
            <div className="muted" style={{ fontSize: 11 }}>GAINS</div>
            {row("Kp", kp, setKp, 10, 0.1)}
            {row("Ki", ki, setKi, 5, 0.05)}
            {row("Kd", kd, setKd, 3, 0.05)}
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>METRICS</div>
            <table className="tbl">
              <tbody>
                <tr><td>Overshoot</td><td><code>{metrics.overshoot.toFixed(1)}%</code></td></tr>
                <tr><td>Settling (±2%)</td><td><code>{metrics.settle}s</code></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
