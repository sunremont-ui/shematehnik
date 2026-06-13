export type TraceLayer = "external" | "internal";

export interface VoltageDividerInput {
  vin: number;
  rTop: number;
  rBottom: number;
  loadOhm?: number;
}

export interface VoltageDividerResult {
  vin: number;
  rTop: number;
  rBottom: number;
  loadOhm?: number;
  rBottomEffective: number;
  vout: number;
  ratio: number;
  dividerCurrentA: number;
  loadCurrentA: number;
  powerTopW: number;
  powerBottomW: number;
  powerLoadW: number;
  sourcePowerW: number;
}

export interface LedResistorInput {
  supplyVoltage: number;
  forwardVoltage: number;
  currentA: number;
  ledsInSeries: number;
}

export interface LedResistorResult {
  supplyVoltage: number;
  forwardVoltageTotal: number;
  currentA: number;
  ledsInSeries: number;
  headroomV: number;
  resistorOhm: number;
  nearestE12Ohm: number;
  actualCurrentA: number;
  resistorPowerW: number;
  nearestPowerW: number;
  ledPowerW: number;
  recommendedWattageW: number;
}

export interface TraceWidthInput {
  currentA: number;
  tempRiseC: number;
  copperOz: number;
  lengthMm: number;
  layer: TraceLayer;
}

export interface TraceWidthResult {
  currentA: number;
  tempRiseC: number;
  copperOz: number;
  lengthMm: number;
  layer: TraceLayer;
  areaMil2: number;
  widthMil: number;
  widthMm: number;
  thicknessMm: number;
  resistanceOhm: number;
  voltageDropV: number;
  powerLossW: number;
}

export interface LdoThermalInput {
  vin: number;
  vout: number;
  currentA: number;
  thetaJaCPerW: number;
  ambientC: number;
  maxJunctionC: number;
}

export interface LdoThermalResult {
  vin: number;
  vout: number;
  currentA: number;
  thetaJaCPerW: number;
  ambientC: number;
  maxJunctionC: number;
  dropoutV: number;
  dissipatedW: number;
  temperatureRiseC: number;
  junctionC: number;
  maxCurrentA: number;
  currentMarginA: number;
  efficiency: number;
  status: "ok" | "warn" | "fail";
}

const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.017241;
const COPPER_1OZ_THICKNESS_MM = 0.0348;
const IPC2221_K: Record<TraceLayer, number> = {
  external: 0.048,
  internal: 0.024,
};
const E12_BASE = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const RESISTOR_WATTAGES = [0.125, 0.25, 0.5, 1, 2, 3, 5];

export function calculateVoltageDivider(input: VoltageDividerInput): VoltageDividerResult {
  const vin = finite(input.vin, 5);
  const rTop = positive(input.rTop, 10_000);
  const rBottom = positive(input.rBottom, 10_000);
  const loadOhm = Number.isFinite(input.loadOhm) && input.loadOhm! > 0 ? input.loadOhm : undefined;
  const rBottomEffective = loadOhm ? parallel(rBottom, loadOhm) : rBottom;
  const total = rTop + rBottomEffective;
  const dividerCurrentA = vin / total;
  const vout = dividerCurrentA * rBottomEffective;
  const loadCurrentA = loadOhm ? vout / loadOhm : 0;
  const powerTopW = dividerCurrentA * dividerCurrentA * rTop;
  const powerBottomW = vout * vout / rBottom;
  const powerLoadW = loadOhm ? vout * vout / loadOhm : 0;

  return {
    vin,
    rTop,
    rBottom,
    loadOhm,
    rBottomEffective,
    vout,
    ratio: vout / Math.max(1e-12, vin),
    dividerCurrentA,
    loadCurrentA,
    powerTopW,
    powerBottomW,
    powerLoadW,
    sourcePowerW: vin * dividerCurrentA,
  };
}

export function solveDividerBottom(vin: number, vout: number, rTop: number): number {
  const safeVin = positive(vin, 5);
  const safeVout = Math.max(0, finite(vout, 3.3));
  const safeTop = positive(rTop, 10_000);
  if (safeVout <= 0) return 0;
  if (safeVout >= safeVin) return Number.POSITIVE_INFINITY;
  return safeTop * safeVout / (safeVin - safeVout);
}

export function calculateLedResistor(input: LedResistorInput): LedResistorResult {
  const supplyVoltage = positive(input.supplyVoltage, 5);
  const forwardVoltage = positive(input.forwardVoltage, 2);
  const currentA = positive(input.currentA, 0.02);
  const ledsInSeries = Math.max(1, Math.round(positive(input.ledsInSeries, 1)));
  const forwardVoltageTotal = forwardVoltage * ledsInSeries;
  const headroomV = supplyVoltage - forwardVoltageTotal;
  const resistorOhm = headroomV > 0 ? headroomV / currentA : 0;
  const nearestE12Ohm = resistorOhm > 0 ? nearestPreferredResistor(resistorOhm) : 0;
  const actualCurrentA = nearestE12Ohm > 0 ? headroomV / nearestE12Ohm : 0;
  const resistorPowerW = currentA * currentA * resistorOhm;
  const nearestPowerW = actualCurrentA * actualCurrentA * nearestE12Ohm;
  return {
    supplyVoltage,
    forwardVoltageTotal,
    currentA,
    ledsInSeries,
    headroomV,
    resistorOhm,
    nearestE12Ohm,
    actualCurrentA,
    resistorPowerW,
    nearestPowerW,
    ledPowerW: forwardVoltageTotal * actualCurrentA,
    recommendedWattageW: recommendResistorWattage(nearestPowerW || resistorPowerW),
  };
}

export function nearestPreferredResistor(ohms: number): number {
  if (!Number.isFinite(ohms) || ohms <= 0) return 0;
  const exp = Math.floor(Math.log10(ohms));
  let best = E12_BASE[0] * 10 ** exp;
  let bestErr = Number.POSITIVE_INFINITY;
  for (let decade = exp - 1; decade <= exp + 1; decade++) {
    for (const base of E12_BASE) {
      const candidate = base * 10 ** decade;
      const err = Math.abs(Math.log(candidate / ohms));
      if (err < bestErr) {
        best = candidate;
        bestErr = err;
      }
    }
  }
  return roundSignificant(best, 3);
}

export function calculateTraceWidth(input: TraceWidthInput): TraceWidthResult {
  const currentA = positive(input.currentA, 1);
  const tempRiseC = Math.max(1, positive(input.tempRiseC, 10));
  const copperOz = positive(input.copperOz, 1);
  const lengthMm = positive(input.lengthMm, 50);
  const layer = input.layer === "internal" ? "internal" : "external";
  const k = IPC2221_K[layer];
  const areaMil2 = Math.pow(currentA / (k * Math.pow(tempRiseC, 0.44)), 1 / 0.725);
  const thicknessMm = copperOz * COPPER_1OZ_THICKNESS_MM;
  const thicknessMil = thicknessMm / 0.0254;
  const widthMil = areaMil2 / thicknessMil;
  const widthMm = widthMil * 0.0254;
  const crossSectionMm2 = widthMm * thicknessMm;
  const resistanceOhm = COPPER_RESISTIVITY_OHM_MM2_PER_M * (lengthMm / 1000) / Math.max(1e-12, crossSectionMm2);
  const voltageDropV = currentA * resistanceOhm;
  return {
    currentA,
    tempRiseC,
    copperOz,
    lengthMm,
    layer,
    areaMil2,
    widthMil,
    widthMm,
    thicknessMm,
    resistanceOhm,
    voltageDropV,
    powerLossW: currentA * voltageDropV,
  };
}

export function calculateLdoThermal(input: LdoThermalInput): LdoThermalResult {
  const vin = positive(input.vin, 12);
  const vout = positive(input.vout, 5);
  const currentA = positive(input.currentA, 0.1);
  const thetaJaCPerW = positive(input.thetaJaCPerW, 50);
  const ambientC = finite(input.ambientC, 25);
  const maxJunctionC = finite(input.maxJunctionC, 125);
  const dropoutV = Math.max(0, vin - vout);
  const dissipatedW = dropoutV * currentA;
  const temperatureRiseC = dissipatedW * thetaJaCPerW;
  const junctionC = ambientC + temperatureRiseC;
  const thermalHeadroomC = maxJunctionC - ambientC;
  const maxCurrentA = dropoutV > 0 && thermalHeadroomC > 0
    ? thermalHeadroomC / (thetaJaCPerW * dropoutV)
    : Number.POSITIVE_INFINITY;
  const currentMarginA = maxCurrentA - currentA;
  const limitSpan = Math.max(1, maxJunctionC - ambientC);
  const status = junctionC > maxJunctionC ? "fail" : junctionC > ambientC + limitSpan * 0.8 ? "warn" : "ok";

  return {
    vin,
    vout,
    currentA,
    thetaJaCPerW,
    ambientC,
    maxJunctionC,
    dropoutV,
    dissipatedW,
    temperatureRiseC,
    junctionC,
    maxCurrentA,
    currentMarginA,
    efficiency: vout / vin,
    status,
  };
}

export function formatEngineering(value: number, unit = ""): string {
  if (!Number.isFinite(value)) return value > 0 ? `inf${unit}` : `-${unit}`;
  if (value === 0) return `0${unit}`;
  const prefixes: Record<number, string> = {
    [-12]: "p",
    [-9]: "n",
    [-6]: "u",
    [-3]: "m",
    0: "",
    3: "k",
    6: "M",
    9: "G",
  };
  const exp = Math.max(-12, Math.min(9, Math.floor(Math.log10(Math.abs(value)) / 3) * 3));
  const scaled = value / 10 ** exp;
  const text = Math.abs(scaled) >= 100 ? scaled.toFixed(0) : Math.abs(scaled) >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${text}${prefixes[exp] ?? ""}${unit}`;
}

export function buildEeCalcReport(
  divider: VoltageDividerResult,
  led: LedResistorResult,
  trace: TraceWidthResult,
  ldo: LdoThermalResult,
): string {
  return [
    "# EE Calculators report",
    "",
    `- Divider: Vin ${formatEngineering(divider.vin, "V")}, Vout ${formatEngineering(divider.vout, "V")}, ratio ${(divider.ratio * 100).toFixed(1)}%.`,
    `- LED resistor: ${formatEngineering(led.resistorOhm, "ohm")} nominal, ${formatEngineering(led.nearestE12Ohm, "ohm")} E12, ${formatEngineering(led.nearestPowerW, "W")} dissipation.`,
    `- Trace width: ${formatEngineering(trace.widthMm, "m")} on ${trace.layer} layer, ${formatEngineering(trace.voltageDropV, "V")} drop over ${trace.lengthMm}mm.`,
    `- LDO thermal: ${formatEngineering(ldo.dissipatedW, "W")} loss, Tj ${ldo.junctionC.toFixed(1)}C, status ${ldo.status}.`,
  ].join("\n");
}

function parallel(a: number, b: number): number {
  return 1 / (1 / a + 1 / b);
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function recommendResistorWattage(powerW: number): number {
  const target = Math.max(0, powerW) * 2;
  return RESISTOR_WATTAGES.find((rating) => rating >= target) ?? RESISTOR_WATTAGES[RESISTOR_WATTAGES.length - 1];
}

function roundSignificant(value: number, digits: number): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const scale = 10 ** (digits - 1 - Math.floor(Math.log10(Math.abs(value))));
  return Math.round(value * scale) / scale;
}
