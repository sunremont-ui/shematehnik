import { useMemo, useState } from "react";
import { MODULE_INDEX } from "../data/modules.ts";
import { useUcp } from "../store.ts";
import {
  TOPOLOGY_LABELS,
  defaultFilterParams,
  designFilter,
  exportFilterCsv,
  formatEngineering,
  nearestFilterPoint,
  presetForTopology,
  type FilterParams,
  type FilterPoint,
  type FilterTopology,
} from "../filter.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

const TOPOLOGIES = Object.keys(TOPOLOGY_LABELS) as FilterTopology[];

export function FilterDesignerView() {
  const mod = MODULE_INDEX["filter"];
  const ucp = useUcp();
  const [params, setParams] = useState<FilterParams>(() => defaultFilterParams());
  const response = useMemo(() => designFilter(params), [params]);
  const atFc = nearestFilterPoint(response, response.fc);

  function setParam<K extends keyof FilterParams>(key: K, value: FilterParams[K]) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function setNumber(key: keyof FilterParams, value: string) {
    const n = Number(value);
    if (Number.isFinite(n)) setParams((prev) => ({ ...prev, [key]: n }));
  }

  function setTopology(topology: FilterTopology) {
    setParams((prev) => {
      const next = presetForTopology(topology);
      return { ...next, fStart: prev.fStart, fStop: prev.fStop, points: prev.points };
    });
  }

  function exportCsv() {
    downloadText("filter-response.csv", exportFilterCsv(response), "text/csv");
    ucp.setStatus(`Exported ${response.topologyLabel} response CSV`);
  }

  const showL = params.topology === "rlc_lowpass" || params.topology === "rlc_bandpass";
  const showActive = params.topology === "active_lowpass";

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <span className="chip"><span className="dot ok" />fc {formatEngineering(response.fc, "Hz")}</span>
          {response.q && <span className="chip">Q {response.q.toFixed(2)}</span>}
          <button className="btn primary" onClick={exportCsv}>Export CSV</button>
        </>
      } />

      <div className="grid cols2" style={{ alignItems: "start" }}>
        <div className="card" style={{ display: "grid", gap: 14 }}>
          <BodeChart points={response.points} cutoff={response.cutoffDb} />
          <div className="toolbar" style={{ margin: 0 }}>
            <span className="chip">Peak {response.peakDb.toFixed(2)} dB</span>
            <span className="chip">At fc {atFc.magDb.toFixed(2)} dB / {atFc.phaseDeg.toFixed(0)} deg</span>
            {response.bandwidth && <span className="chip">BW {formatEngineering(response.bandwidth, "Hz")}</span>}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <label className="field">Topology
              <select value={params.topology} onChange={(e) => setTopology(e.target.value as FilterTopology)}>
                {TOPOLOGIES.map((topology) => (
                  <option key={topology} value={topology}>{TOPOLOGY_LABELS[topology]}</option>
                ))}
              </select>
            </label>

            <div className="grid cols2">
              <NumberField label="R" suffix="ohm" value={params.r} onChange={(v) => setNumber("r", v)} />
              <NumberField label="C" suffix="F" value={params.c} onChange={(v) => setNumber("c", v)} />
              {showL && <NumberField label="L" suffix="H" value={params.l} onChange={(v) => setNumber("l", v)} />}
              {showActive && <NumberField label="Gain" suffix="x" value={params.gain} onChange={(v) => setNumber("gain", v)} />}
              {showActive && <NumberField label="Q" suffix="" value={params.q} onChange={(v) => setNumber("q", v)} />}
            </div>
          </div>

          <div className="card" style={{ display: "grid", gap: 12 }}>
            <div className="muted" style={{ fontSize: 11 }}>SWEEP</div>
            <div className="grid cols2">
              <NumberField label="Start" suffix="Hz" value={params.fStart} onChange={(v) => setNumber("fStart", v)} />
              <NumberField label="Stop" suffix="Hz" value={params.fStop} onChange={(v) => setNumber("fStop", v)} />
            </div>
            <label className="field">Points
              <input
                type="range"
                min={24}
                max={240}
                step={4}
                value={params.points}
                onChange={(e) => setParam("points", Number(e.target.value))}
              />
              <span style={{ fontFamily: "var(--mono)", color: "var(--accent-soft)" }}>{params.points}</span>
            </label>
          </div>

          <div className="card">
            <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>CIRCUIT</div>
            <table className="tbl">
              <tbody>
                <tr><td>fc</td><td><code>{formatEngineering(response.fc, "Hz")}</code></td></tr>
                <tr><td>R / C</td><td><code>{formatEngineering(params.r, "ohm")} / {formatEngineering(params.c, "F")}</code></td></tr>
                {showL && <tr><td>L</td><td><code>{formatEngineering(params.l, "H")}</code></td></tr>}
                {showActive && <tr><td>Gain / Q</td><td><code>{params.gain.toFixed(2)}x / {params.q.toFixed(2)}</code></td></tr>}
                <tr><td>Model</td><td><code>{response.circuit?.description ?? "2nd order active approximation"}</code></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (v: string) => void }) {
  return (
    <label className="field">{label}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="number"
          step="any"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", minWidth: 0 }}
        />
        <span className="muted" style={{ width: 34, fontSize: 11 }}>{suffix}</span>
      </div>
    </label>
  );
}

function BodeChart({ points, cutoff }: { points: FilterPoint[]; cutoff: number }) {
  const pad = { l: 52, r: 16, t: 18, b: 34 };
  const width = 720;
  const height = 320;
  const minF = points[0]?.f ?? 1;
  const maxF = points[points.length - 1]?.f ?? 10;
  const minMag = Math.min(...points.map((p) => p.magDb), cutoff);
  const maxMag = Math.max(...points.map((p) => p.magDb), 0);
  const yMin = Math.floor((minMag - 4) / 10) * 10;
  const yMax = Math.ceil((maxMag + 4) / 10) * 10;
  const logMin = Math.log10(minF);
  const logMax = Math.log10(maxF);
  const x = (f: number) => pad.l + ((Math.log10(f) - logMin) / Math.max(1e-9, logMax - logMin)) * (width - pad.l - pad.r);
  const y = (mag: number) => pad.t + ((yMax - mag) / Math.max(1e-9, yMax - yMin)) * (height - pad.t - pad.b);
  const line = points.map((p) => `${x(p.f).toFixed(1)},${y(p.magDb).toFixed(1)}`).join(" ");
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * (i / 4));
  const xTicks = Array.from({ length: 5 }, (_, i) => Math.pow(10, logMin + (logMax - logMin) * (i / 4)));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bode magnitude response" style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={0} y={0} width={width} height={height} fill="var(--base)" rx={6} />
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke="var(--border)" />
          <text x={8} y={y(tick) + 4} fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">{tick.toFixed(0)} dB</text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={pad.t} y2={height - pad.b} stroke="var(--border)" />
          <text x={x(tick)} y={height - 10} textAnchor="middle" fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">
            {formatEngineering(tick, "Hz")}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={width - pad.r} y1={y(cutoff)} y2={y(cutoff)} stroke="var(--muted)" strokeDasharray="5 5" />
      <polyline points={line} fill="none" stroke="var(--accent-soft)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={pad.l} y={14} fill="var(--muted)" fontSize={11}>Magnitude</text>
    </svg>
  );
}
