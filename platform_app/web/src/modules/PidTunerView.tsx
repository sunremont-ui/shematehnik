import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { pidStep, useCoreBackend } from "../core/ucpCore.ts";
import { useSerial, serialOpen, serialWrite, onSerialData, LineBuffer, parseTelemetry, type Telemetry } from "../serial.ts";

export function PidTunerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["pid"];
  const backend = useCoreBackend();
  const serial = useSerial();
  const [kp, setKp] = useState(2.0);
  const [ki, setKi] = useState(0.5);
  const [kd, setKd] = useState(0.1);
  const setpoint = 100;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live-режим: телеметрия с реального устройства по Web Serial
  // (строки вида "T:26.1 S:60 O:128" — формат debug-печати прошивок).
  const [live, setLive] = useState(false);
  const [liveData, setLiveData] = useState<number[]>([]);
  const [lastTel, setLastTel] = useState<Telemetry | null>(null);
  const [liveSp, setLiveSp] = useState(60);

  useEffect(() => {
    if (!live) return;
    const lb = new LineBuffer();
    return onSerialData((chunk) => {
      for (const line of lb.push(chunk)) {
        const t = parseTelemetry(line);
        if (!t) continue;
        setLastTel(t);
        if (t.t != null) setLiveData((d) => [...d.slice(-199), t.t!]);
      }
    });
  }, [live]);

  // Симуляция переходного процесса считается ядром (WASM ↔ JS-фолбэк).
  const simData = useMemo(() => pidStep(kp, ki, kd, setpoint, 200), [kp, ki, kd]);
  const data = live ? liveData : simData;
  const sp = live ? (lastTel?.s ?? liveSp) : setpoint;

  const metrics = useMemo(() => {
    if (!simData.length) return { overshoot: 0, settle: "0" };
    const peak = Math.max(...simData);
    const overshoot = Math.max(0, ((peak - setpoint) / setpoint) * 100);
    let settle = simData.length;
    for (let i = simData.length - 1; i >= 0; i--) {
      if (Math.abs(simData[i] - setpoint) > setpoint * 0.02) { settle = i + 1; break; }
    }
    return { overshoot, settle: (settle * 0.1).toFixed(1) };
  }, [simData]);

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
    const ymax = Math.max(sp, ...data, 1) * 1.25;
    const yScreen = (v: number) => H - pad - (v / ymax) * (H - 2 * pad);
    const xScreen = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = c("--muted");
    ctx.beginPath(); ctx.moveTo(pad, yScreen(sp)); ctx.lineTo(W - pad, yScreen(sp)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c("--muted"); ctx.font = "10px monospace";
    ctx.fillText(`SP=${sp}`, W - pad - 46, yScreen(sp) - 4);
    // response
    ctx.strokeStyle = c("--accent-soft"); ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => { const x = xScreen(i), y = yScreen(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }, [data, sp]);

  async function sendSetpoint() {
    try { await serialWrite(new TextEncoder().encode(`S=${liveSp}\n`)); ucp.setStatus(`Setpoint → ${liveSp}`); }
    catch (e) { ucp.setStatus(`TX: ${e instanceof Error ? e.message : e}`); }
  }
  async function connect() {
    try { await serialOpen(115200); ucp.setStatus("Serial open @ 115200"); }
    catch (e) { ucp.setStatus(`Serial: ${e instanceof Error ? e.message : e}`); }
  }

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
        <>
          <button className={`btn${live ? "" : " primary"}`} onClick={() => setLive(false)}>Sim</button>
          <button className={`btn${live ? " primary" : ""}`} onClick={() => { setLiveData([]); setLive(true); }}>Live</button>
          <span className="chip" title="вычислительное ядро">
            <span className={`dot ${backend === "wasm" ? "ok" : backend === "js" ? "warn" : ""}`} />
            engine: {backend}
          </span>
          <button className="btn primary" onClick={() => ucp.setStatus(`PID exported: Kp=${kp} Ki=${ki} Kd=${kd}`)}>
            Export coefficients
          </button>
        </>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        <div className="card" style={{ padding: 12 }}>
          <canvas ref={canvasRef} width={640} height={360} style={{ width: "100%", height: "auto" }} />
        </div>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          {live ? (
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div className="muted" style={{ fontSize: 11 }}>LIVE — Web Serial</div>
              {serial.status !== "open" && (
                <>
                  <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                    {serial.supported ? "Порт закрыт — подключите устройство." : "Web Serial недоступен (нужен Chrome/Edge)."}
                  </p>
                  <button className="btn primary" disabled={!serial.supported} onClick={() => void connect()}>Connect @ 115200</button>
                </>
              )}
              <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <span style={{ width: 28, fontFamily: "monospace" }}>SP</span>
                <input type="number" value={liveSp} style={{ width: 70 }} onChange={(e) => setLiveSp(+e.target.value)} />
                <button className="btn" disabled={serial.status !== "open"} onClick={() => void sendSetpoint()}>Send</button>
              </label>
              <table className="tbl">
                <tbody>
                  <tr><td>T</td><td><code>{lastTel?.t?.toFixed(1) ?? "—"}</code></td></tr>
                  <tr><td>S</td><td><code>{lastTel?.s ?? "—"}</code></td></tr>
                  <tr><td>Out</td><td><code>{lastTel?.o ?? "—"}</code></td></tr>
                  <tr><td>Points</td><td><code>{liveData.length}</code></td></tr>
                </tbody>
              </table>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
