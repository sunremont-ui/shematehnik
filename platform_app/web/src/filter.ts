import { acSweep, type Elem } from "./spice.ts";

export type FilterTopology =
  | "rc_lowpass"
  | "rc_highpass"
  | "rlc_lowpass"
  | "rlc_bandpass"
  | "active_lowpass";

export interface FilterParams {
  topology: FilterTopology;
  r: number;
  c: number;
  l: number;
  gain: number;
  q: number;
  fStart: number;
  fStop: number;
  points: number;
}

export interface FilterPoint {
  f: number;
  magDb: number;
  phaseDeg: number;
}

export interface FilterCircuit {
  numNodes: number;
  ground: number;
  input: number;
  probe: number;
  elems: Elem[];
  description: string;
}

export interface FilterResponse {
  params: FilterParams;
  topologyLabel: string;
  circuit?: FilterCircuit;
  fc: number;
  q?: number;
  bandwidth?: number;
  peakDb: number;
  cutoffDb: number;
  points: FilterPoint[];
}

export const TOPOLOGY_LABELS: Record<FilterTopology, string> = {
  rc_lowpass: "RC low-pass",
  rc_highpass: "RC high-pass",
  rlc_lowpass: "RLC low-pass",
  rlc_bandpass: "RLC band-pass",
  active_lowpass: "Active low-pass",
};

export function defaultFilterParams(): FilterParams {
  return presetForTopology("rc_lowpass");
}

export function presetForTopology(topology: FilterTopology): FilterParams {
  const common = { topology, gain: 1, q: 0.707, fStart: 10, fStop: 100_000, points: 120 };
  if (topology === "rlc_lowpass" || topology === "rlc_bandpass") {
    return { ...common, r: 100, c: 100e-9, l: 10e-3 };
  }
  if (topology === "active_lowpass") {
    return { ...common, r: 10_000, c: 10e-9, l: 10e-3, gain: 2 };
  }
  return { ...common, r: 1_000, c: 1e-6, l: 10e-3 };
}

export function normalizeFilterParams(params: FilterParams): FilterParams {
  const safe = (value: number, fallback: number, min = Number.MIN_VALUE) =>
    Number.isFinite(value) && value >= min ? value : fallback;
  const r = safe(params.r, 1_000);
  const c = safe(params.c, 1e-6);
  const l = safe(params.l, 10e-3);
  const gain = safe(params.gain, 1, 0);
  const q = safe(params.q, 0.707);
  const fStart = safe(params.fStart, 10);
  const fStop = safe(params.fStop, fStart * 1_000);
  return {
    ...params,
    r,
    c,
    l,
    gain,
    q,
    fStart,
    fStop: fStop > fStart ? fStop : fStart * 1_000,
    points: Math.max(2, Math.min(400, Math.round(safe(params.points, 120, 2)))),
  };
}

export function cutoffFrequency(params: Pick<FilterParams, "topology" | "r" | "c" | "l">): number {
  if (params.topology === "rlc_lowpass" || params.topology === "rlc_bandpass") {
    return 1 / (2 * Math.PI * Math.sqrt(params.l * params.c));
  }
  return 1 / (2 * Math.PI * params.r * params.c);
}

export function filterQ(params: Pick<FilterParams, "topology" | "r" | "c" | "l" | "q">): number | undefined {
  if (params.topology === "rlc_lowpass" || params.topology === "rlc_bandpass") {
    return Math.sqrt(params.l / params.c) / params.r;
  }
  if (params.topology === "active_lowpass") return params.q;
  return undefined;
}

export function filterCircuit(params: FilterParams): FilterCircuit | undefined {
  const p = normalizeFilterParams(params);
  switch (p.topology) {
    case "rc_lowpass":
      return {
        numNodes: 3,
        ground: 2,
        input: 0,
        probe: 1,
        elems: [
          { ref: "R1", kind: "R", a: 0, b: 1, value: p.r },
          { ref: "C1", kind: "C", a: 1, b: 2, value: p.c },
        ],
        description: "Vin -> R -> Vout, C to ground",
      };
    case "rc_highpass":
      return {
        numNodes: 3,
        ground: 2,
        input: 0,
        probe: 1,
        elems: [
          { ref: "C1", kind: "C", a: 0, b: 1, value: p.c },
          { ref: "R1", kind: "R", a: 1, b: 2, value: p.r },
        ],
        description: "Vin -> C -> Vout, R to ground",
      };
    case "rlc_lowpass":
      return {
        numNodes: 4,
        ground: 3,
        input: 0,
        probe: 2,
        elems: [
          { ref: "R1", kind: "R", a: 0, b: 1, value: p.r },
          { ref: "L1", kind: "L", a: 1, b: 2, value: p.l },
          { ref: "C1", kind: "C", a: 2, b: 3, value: p.c },
        ],
        description: "Vin -> R -> L -> Vout, C to ground",
      };
    case "rlc_bandpass":
      return {
        numNodes: 4,
        ground: 3,
        input: 0,
        probe: 2,
        elems: [
          { ref: "C1", kind: "C", a: 0, b: 1, value: p.c },
          { ref: "L1", kind: "L", a: 1, b: 2, value: p.l },
          { ref: "R1", kind: "R", a: 2, b: 3, value: p.r },
        ],
        description: "Series C-L-R, Vout across R",
      };
    case "active_lowpass":
      return undefined;
  }
}

export function designFilter(params: FilterParams): FilterResponse {
  const p = normalizeFilterParams(params);
  const fc = cutoffFrequency(p);
  const q = filterQ(p);
  const circuit = filterCircuit(p);
  const points = p.topology === "active_lowpass"
    ? activeLowpass(p, fc)
    : passiveResponse(p, circuit!);
  const peakDb = Math.max(...points.map((point) => point.magDb));
  const cutoffDb = p.topology === "active_lowpass"
    ? 20 * Math.log10(Math.max(1e-12, p.gain)) - 3.01
    : peakDb - 3.01;
  return {
    params: p,
    topologyLabel: TOPOLOGY_LABELS[p.topology],
    circuit,
    fc,
    q,
    bandwidth: q ? fc / q : undefined,
    peakDb,
    cutoffDb,
    points,
  };
}

function passiveResponse(params: FilterParams, circuit: FilterCircuit): FilterPoint[] {
  const ac = acSweep({
    ...circuit,
    fStart: params.fStart,
    fStop: params.fStop,
    points: params.points,
  });
  return ac.f.map((f, i) => ({
    f,
    magDb: ac.magDb[i] ?? -240,
    phaseDeg: ac.phaseDeg[i] ?? 0,
  }));
}

function activeLowpass(params: FilterParams, fc: number): FilterPoint[] {
  const loglo = Math.log10(params.fStart);
  const loghi = Math.log10(params.fStop);
  return Array.from({ length: params.points }, (_, i) => {
    const t = params.points === 1 ? 0 : i / (params.points - 1);
    const f = Math.pow(10, loglo + (loghi - loglo) * t);
    const x = f / fc;
    const real = 1 - x * x;
    const imag = x / params.q;
    const denom = Math.hypot(real, imag);
    const mag = params.gain / Math.max(1e-12, denom);
    return {
      f,
      magDb: 20 * Math.log10(Math.max(1e-12, mag)),
      phaseDeg: -Math.atan2(imag, real) * 180 / Math.PI,
    };
  });
}

export function nearestFilterPoint(response: FilterResponse, f: number): FilterPoint {
  return response.points.reduce((best, point) =>
    Math.abs(Math.log(point.f / f)) < Math.abs(Math.log(best.f / f)) ? point : best,
  );
}

export function exportFilterCsv(response: FilterResponse): string {
  const lines = [
    "topology,fc_hz,q,bandwidth_hz",
    `${response.topologyLabel},${response.fc},${response.q ?? ""},${response.bandwidth ?? ""}`,
    "",
    "frequency_hz,magnitude_db,phase_deg",
  ];
  for (const point of response.points) lines.push(`${point.f},${point.magDb},${point.phaseDeg}`);
  return lines.join("\n");
}

export function formatEngineering(value: number, unit = ""): string {
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return `0${unit}`;
  const prefixes: Record<number, string> = { [-12]: "p", [-9]: "n", [-6]: "u", [-3]: "m", 0: "", 3: "k", 6: "M", 9: "G" };
  const exp = Math.max(-12, Math.min(9, Math.floor(Math.log10(Math.abs(value)) / 3) * 3));
  const scaled = value / 10 ** exp;
  const text = Math.abs(scaled) >= 100 ? scaled.toFixed(0) : Math.abs(scaled) >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${text}${prefixes[exp] ?? ""}${unit}`;
}
