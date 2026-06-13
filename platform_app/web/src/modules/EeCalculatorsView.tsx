import { useMemo, useState } from "react";
import { MODULE_INDEX } from "../data/modules.ts";
import {
  buildEeCalcReport,
  calculateLdoThermal,
  calculateLedResistor,
  calculateTraceWidth,
  calculateVoltageDivider,
  formatEngineering,
  type LdoThermalInput,
  type LedResistorInput,
  type TraceLayer,
  type TraceWidthInput,
  type VoltageDividerInput,
} from "../eecalc.ts";
import { useUcp } from "../store.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

export function EeCalculatorsView() {
  const mod = MODULE_INDEX["eecalc"];
  const ucp = useUcp();
  const [divider, setDivider] = useState<VoltageDividerInput>({
    vin: 5,
    rTop: 10_000,
    rBottom: 20_000,
    loadOhm: 100_000,
  });
  const [led, setLed] = useState<LedResistorInput>({
    supplyVoltage: 5,
    forwardVoltage: 2,
    currentA: 0.02,
    ledsInSeries: 1,
  });
  const [trace, setTrace] = useState<TraceWidthInput>({
    currentA: 2,
    tempRiseC: 10,
    copperOz: 1,
    lengthMm: 100,
    layer: "external",
  });
  const [ldo, setLdo] = useState<LdoThermalInput>({
    vin: 12,
    vout: 5,
    currentA: 0.1,
    thetaJaCPerW: 50,
    ambientC: 25,
    maxJunctionC: 125,
  });

  const dividerResult = useMemo(() => calculateVoltageDivider(divider), [divider]);
  const ledResult = useMemo(() => calculateLedResistor(led), [led]);
  const traceResult = useMemo(() => calculateTraceWidth(trace), [trace]);
  const ldoResult = useMemo(() => calculateLdoThermal(ldo), [ldo]);
  const report = useMemo(
    () => buildEeCalcReport(dividerResult, ledResult, traceResult, ldoResult),
    [dividerResult, ledResult, traceResult, ldoResult],
  );

  function exportReport() {
    downloadText("ee-calculators-report.md", report, "text/markdown");
    ucp.setStatus("Exported EE Calculators report");
  }

  const thermalDot = ldoResult.status === "fail" ? "bad" : ldoResult.status === "warn" ? "warn" : "ok";

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <span className="chip"><span className="dot ok" />Vout {formatEngineering(dividerResult.vout, "V")}</span>
          <span className="chip">LED {formatEngineering(ledResult.nearestE12Ohm, "ohm")}</span>
          <span className="chip">Trace {traceResult.widthMm.toFixed(2)} mm</span>
          <span className="chip"><span className={`dot ${thermalDot}`} />Tj {ldoResult.junctionC.toFixed(1)}C</span>
          <button className="btn primary" onClick={exportReport}>Download report.md</button>
        </>
      } />

      <div className="grid cols2" style={{ alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <section className="card" style={{ display: "grid", gap: 12 }}>
            <CardTitle title="Voltage Divider" metric={formatEngineering(dividerResult.vout, "V")} />
            <div className="grid cols2">
              <NumberField label="Vin" suffix="V" value={divider.vin} onChange={(v) => setDivider((p) => ({ ...p, vin: v }))} />
              <NumberField label="R top" suffix="ohm" value={divider.rTop} onChange={(v) => setDivider((p) => ({ ...p, rTop: v }))} />
              <NumberField label="R bottom" suffix="ohm" value={divider.rBottom} onChange={(v) => setDivider((p) => ({ ...p, rBottom: v }))} />
              <NumberField label="Load" suffix="ohm" value={divider.loadOhm ?? 0} onChange={(v) => setDivider((p) => ({ ...p, loadOhm: v > 0 ? v : undefined }))} />
            </div>
            <DividerGauge ratio={dividerResult.ratio} />
            <ResultTable rows={[
              ["Vout", formatEngineering(dividerResult.vout, "V")],
              ["Ratio", `${(dividerResult.ratio * 100).toFixed(1)}%`],
              ["R bottom effective", formatEngineering(dividerResult.rBottomEffective, "ohm")],
              ["Divider current", formatEngineering(dividerResult.dividerCurrentA, "A")],
              ["Load current", formatEngineering(dividerResult.loadCurrentA, "A")],
            ]} />
          </section>

          <section className="card" style={{ display: "grid", gap: 12 }}>
            <CardTitle title="LED Resistor" metric={formatEngineering(ledResult.nearestE12Ohm, "ohm")} />
            <div className="grid cols2">
              <NumberField label="Supply" suffix="V" value={led.supplyVoltage} onChange={(v) => setLed((p) => ({ ...p, supplyVoltage: v }))} />
              <NumberField label="Vf each" suffix="V" value={led.forwardVoltage} onChange={(v) => setLed((p) => ({ ...p, forwardVoltage: v }))} />
              <NumberField label="Current" suffix="A" value={led.currentA} onChange={(v) => setLed((p) => ({ ...p, currentA: v }))} />
              <NumberField label="Series LEDs" suffix="pcs" value={led.ledsInSeries} onChange={(v) => setLed((p) => ({ ...p, ledsInSeries: v }))} />
            </div>
            <ResultTable rows={[
              ["Headroom", formatEngineering(ledResult.headroomV, "V")],
              ["Nominal R", formatEngineering(ledResult.resistorOhm, "ohm")],
              ["Nearest E12", formatEngineering(ledResult.nearestE12Ohm, "ohm")],
              ["Actual current", formatEngineering(ledResult.actualCurrentA, "A")],
              ["Resistor power", formatEngineering(ledResult.nearestPowerW, "W")],
              ["Use at least", `${ledResult.recommendedWattageW} W`],
            ]} />
          </section>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <section className="card" style={{ display: "grid", gap: 12 }}>
            <CardTitle title="Trace Width" metric={`${traceResult.widthMm.toFixed(2)} mm`} />
            <div className="grid cols2">
              <NumberField label="Current" suffix="A" value={trace.currentA} onChange={(v) => setTrace((p) => ({ ...p, currentA: v }))} />
              <NumberField label="Temp rise" suffix="C" value={trace.tempRiseC} onChange={(v) => setTrace((p) => ({ ...p, tempRiseC: v }))} />
              <NumberField label="Copper" suffix="oz" value={trace.copperOz} onChange={(v) => setTrace((p) => ({ ...p, copperOz: v }))} />
              <NumberField label="Length" suffix="mm" value={trace.lengthMm} onChange={(v) => setTrace((p) => ({ ...p, lengthMm: v }))} />
            </div>
            <label className="field">Layer
              <select value={trace.layer} onChange={(e) => setTrace((p) => ({ ...p, layer: e.target.value as TraceLayer }))}>
                <option value="external">External IPC-2221</option>
                <option value="internal">Internal IPC-2221</option>
              </select>
            </label>
            <TraceCrossSection widthMm={traceResult.widthMm} thicknessMm={traceResult.thicknessMm} />
            <ResultTable rows={[
              ["Width", `${traceResult.widthMm.toFixed(3)} mm / ${traceResult.widthMil.toFixed(1)} mil`],
              ["Area", `${traceResult.areaMil2.toFixed(1)} mil^2`],
              ["Resistance", formatEngineering(traceResult.resistanceOhm, "ohm")],
              ["Voltage drop", formatEngineering(traceResult.voltageDropV, "V")],
              ["Power loss", formatEngineering(traceResult.powerLossW, "W")],
            ]} />
          </section>

          <section className="card" style={{ display: "grid", gap: 12 }}>
            <CardTitle title="LDO Thermal" metric={`${ldoResult.junctionC.toFixed(1)}C`} />
            <div className="grid cols2">
              <NumberField label="Vin" suffix="V" value={ldo.vin} onChange={(v) => setLdo((p) => ({ ...p, vin: v }))} />
              <NumberField label="Vout" suffix="V" value={ldo.vout} onChange={(v) => setLdo((p) => ({ ...p, vout: v }))} />
              <NumberField label="Current" suffix="A" value={ldo.currentA} onChange={(v) => setLdo((p) => ({ ...p, currentA: v }))} />
              <NumberField label="Theta JA" suffix="C/W" value={ldo.thetaJaCPerW} onChange={(v) => setLdo((p) => ({ ...p, thetaJaCPerW: v }))} />
              <NumberField label="Ambient" suffix="C" value={ldo.ambientC} onChange={(v) => setLdo((p) => ({ ...p, ambientC: v }))} />
              <NumberField label="Max Tj" suffix="C" value={ldo.maxJunctionC} onChange={(v) => setLdo((p) => ({ ...p, maxJunctionC: v }))} />
            </div>
            <ThermalBar ambient={ldoResult.ambientC} junction={ldoResult.junctionC} max={ldoResult.maxJunctionC} />
            <ResultTable rows={[
              ["Dissipation", formatEngineering(ldoResult.dissipatedW, "W")],
              ["Temp rise", `${ldoResult.temperatureRiseC.toFixed(1)}C`],
              ["Max current", formatEngineering(ldoResult.maxCurrentA, "A")],
              ["Current margin", formatEngineering(ldoResult.currentMarginA, "A")],
              ["Efficiency", `${(ldoResult.efficiency * 100).toFixed(1)}%`],
              ["Status", ldoResult.status.toUpperCase()],
            ]} />
          </section>
        </div>
      </div>
    </div>
  );
}

function CardTitle({ title, metric }: { title: string; metric: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
      <span style={{ flex: 1 }} />
      <span className="chip">{metric}</span>
    </div>
  );
}

function NumberField({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">{label}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="number"
          step="any"
          value={String(value)}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          style={{ width: "100%", minWidth: 0 }}
        />
        <span className="muted" style={{ width: 42, fontSize: 11 }}>{suffix}</span>
      </div>
    </label>
  );
}

function ResultTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="tbl">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td><code>{value}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DividerGauge({ ratio }: { ratio: number }) {
  const width = 540;
  const height = 78;
  const clamped = Math.max(0, Math.min(1, ratio));
  const x = 30 + clamped * (width - 60);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Voltage divider ratio" style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={0} y={0} width={width} height={height} rx={6} fill="var(--base)" />
      <line x1={30} x2={width - 30} y1={40} y2={40} stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
      <line x1={30} x2={x} y1={40} y2={40} stroke="var(--accent-soft)" strokeWidth={10} strokeLinecap="round" />
      <circle cx={x} cy={40} r={10} fill="var(--accent)" />
      <text x={30} y={66} fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">0%</text>
      <text x={width - 30} y={66} textAnchor="end" fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">100%</text>
      <text x={x} y={22} textAnchor="middle" fill="var(--accent-soft)" fontSize={12} fontFamily="var(--mono)">{(ratio * 100).toFixed(1)}%</text>
    </svg>
  );
}

function TraceCrossSection({ widthMm, thicknessMm }: { widthMm: number; thicknessMm: number }) {
  const width = 540;
  const height = 96;
  const copperWidth = Math.max(70, Math.min(460, widthMm * 140));
  const copperHeight = Math.max(6, Math.min(20, thicknessMm * 380));
  const x = (width - copperWidth) / 2;
  const y = 46 - copperHeight / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trace width cross-section" style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={0} y={0} width={width} height={height} rx={6} fill="var(--base)" />
      <rect x={40} y={58} width={width - 80} height={18} rx={2} fill="var(--panel)" stroke="var(--border)" />
      <rect x={x} y={y} width={copperWidth} height={copperHeight} rx={2} fill="var(--accent)" />
      <line x1={x} x2={x + copperWidth} y1={24} y2={24} stroke="var(--accent-soft)" />
      <line x1={x} x2={x} y1={18} y2={30} stroke="var(--accent-soft)" />
      <line x1={x + copperWidth} x2={x + copperWidth} y1={18} y2={30} stroke="var(--accent-soft)" />
      <text x={width / 2} y={18} textAnchor="middle" fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">
        {widthMm.toFixed(3)} mm trace
      </text>
      <text x={width / 2} y={91} textAnchor="middle" fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">
        copper {thicknessMm.toFixed(4)} mm
      </text>
    </svg>
  );
}

function ThermalBar({ ambient, junction, max }: { ambient: number; junction: number; max: number }) {
  const width = 540;
  const height = 82;
  const span = Math.max(1, max - ambient);
  const pos = Math.max(0, Math.min(1, (junction - ambient) / span));
  const x = 36 + pos * (width - 72);
  const color = junction > max ? "var(--danger)" : pos > 0.8 ? "var(--warn)" : "var(--accent)";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="LDO thermal headroom" style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={0} y={0} width={width} height={height} rx={6} fill="var(--base)" />
      <line x1={36} x2={width - 36} y1={40} y2={40} stroke="var(--border)" strokeWidth={12} strokeLinecap="round" />
      <line x1={36} x2={x} y1={40} y2={40} stroke={color} strokeWidth={12} strokeLinecap="round" />
      <circle cx={x} cy={40} r={10} fill={color} />
      <text x={36} y={66} fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">{ambient.toFixed(0)}C</text>
      <text x={width - 36} y={66} textAnchor="end" fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">{max.toFixed(0)}C</text>
      <text x={x} y={20} textAnchor="middle" fill="var(--accent-soft)" fontSize={12} fontFamily="var(--mono)">{junction.toFixed(1)}C</text>
    </svg>
  );
}
