// ============================================================
// SPICE — узловой анализ (MNA) поверх реальной топологии схемы.
// Узлы берутся из цепей проекта (провода + net-метки), номиналы R/C/L
// парсятся из value. Возбуждение (источник) задаётся в панели анализа —
// как .tran/.ac директива, ссылающаяся на источник между двумя узлами.
//   • DC  — резистивный делитель (mnaDc уже в ядре, тут не дублируем).
//   • TRAN — backward-Euler companion-модели C/L, шаг по времени.
//   • AC  — комплексный MNA на сетке частот → Боде (|H| дБ, фаза).
// Алгоритмы — чистый TS (детерминированы, покрыты Vitest-векторами).
// ============================================================
import type { UcpProject } from "./project.ts";
import { pinsOf } from "./project.ts";

// ---------- Парсер инженерных номиналов: "10k" → 1e4, "100n" → 1e-7 ----------
const SUFFIX: Record<string, number> = {
  f: 1e-15, p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3,
  k: 1e3, K: 1e3, meg: 1e6, M: 1e6, g: 1e9, G: 1e9, t: 1e12,
};
export function parseValue(s: string): number {
  if (s == null) return 0;
  const str = String(s).trim().replace(/(ohms?|Ω|Гн|Ф|H|F)$/i, "").trim();
  const m = str.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(meg|[fpnuµmkKMgGt])?/);
  if (!m) return 0;
  const base = parseFloat(m[1]);
  if (!Number.isFinite(base)) return 0;
  const suf = m[2];
  return suf ? base * (SUFFIX[suf] ?? 1) : base;
}

// ---------- Узлы из топологии (union-find по проводам + net-меткам) ----------
export interface NodeModel {
  nodeOf: Map<string, number>;     // "R1.2" → индекс узла
  groups: { id: number; pins: string[]; label?: string }[];
}

export function buildNodes(p: UcpProject): NodeModel {
  const pins: string[] = [];
  for (const c of p.components) for (const pin of pinsOf(c.kind)) pins.push(`${c.ref}.${pin}`);
  const idx = new Map(pins.map((s, i) => [s, i]));
  const parent = pins.map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const w of p.wires) {
    const a = idx.get(`${w.from.ref}.${w.from.pin}`), b = idx.get(`${w.to.ref}.${w.to.pin}`);
    if (a != null && b != null) parent[find(a)] = find(b);
  }
  const byNet = new Map<string, number[]>();
  const labelOf = new Map<number, string>();
  for (const l of p.labels) {
    const i = idx.get(`${l.ref}.${l.pin}`); if (i == null) continue;
    labelOf.set(i, l.net);
    (byNet.get(l.net) ?? byNet.set(l.net, []).get(l.net)!).push(i);
  }
  for (const idxs of byNet.values()) for (let j = 1; j < idxs.length; j++) parent[find(idxs[0])] = find(idxs[j]);

  const rootToId = new Map<number, number>();
  const groups: { id: number; pins: string[]; label?: string }[] = [];
  const nodeOf = new Map<string, number>();
  pins.forEach((s, i) => {
    const r = find(i);
    let id = rootToId.get(r);
    if (id == null) { id = groups.length; rootToId.set(r, id); groups.push({ id, pins: [] }); }
    groups[id].pins.push(s);
    const lbl = labelOf.get(find(i));
    if (lbl) groups[id].label = lbl;
    nodeOf.set(s, id);
  });
  return { nodeOf, groups };
}

// Удобный список «портов» для выбора в UI: узел → подпись.
export function nodeLabel(g: { pins: string[]; label?: string }): string {
  return g.label ?? g.pins.slice(0, 2).join("·") + (g.pins.length > 2 ? "…" : "");
}

// ---------- Элементы цепи из компонентов ----------
export type ElemKind = "R" | "C" | "L";
export interface Elem { ref: string; kind: ElemKind; a: number; b: number; value: number; }

export function buildElements(p: UcpProject, nodes: NodeModel): Elem[] {
  const out: Elem[] = [];
  for (const c of p.components) {
    if (c.kind !== "R" && c.kind !== "C" && c.kind !== "L") continue;
    const a = nodes.nodeOf.get(`${c.ref}.1`), b = nodes.nodeOf.get(`${c.ref}.2`);
    if (a == null || b == null) continue;
    const value = parseValue(c.value);
    if (!(value > 0)) continue;
    out.push({ ref: c.ref, kind: c.kind, a, b, value });
  }
  return out;
}

// ---------- Линейные решатели ----------
// Действительная система A·x = z (Гаусс с частичным выбором).
function solveReal(A: number[][], z: number[]): number[] {
  const n = z.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]]; [z[col], z[piv]] = [z[piv], z[col]];
    const d = A[col][col]; if (Math.abs(d) < 1e-18) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / d;
      if (f === 0) continue;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      z[r] -= f * z[col];
    }
  }
  return z.map((zi, i) => { const d = A[i][i]; return Math.abs(d) < 1e-18 ? 0 : zi / d; });
}

// Комплексная система (re/im разложены в массивы параллельной длины).
function solveComplex(Ar: number[][], Ai: number[][], zr: number[], zi: number[]): { re: number[]; im: number[] } {
  const n = zr.length;
  const cabs = (r: number, i: number) => Math.hypot(r, i);
  for (let col = 0; col < n; col++) {
    let piv = col, best = cabs(Ar[col][col], Ai[col][col]);
    for (let r = col + 1; r < n; r++) { const m = cabs(Ar[r][col], Ai[r][col]); if (m > best) { best = m; piv = r; } }
    [Ar[col], Ar[piv]] = [Ar[piv], Ar[col]]; [Ai[col], Ai[piv]] = [Ai[piv], Ai[col]];
    [zr[col], zr[piv]] = [zr[piv], zr[col]]; [zi[col], zi[piv]] = [zi[piv], zi[col]];
    const dr = Ar[col][col], di = Ai[col][col], dd = dr * dr + di * di;
    if (dd < 1e-30) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      // f = A[r][col] / A[col][col]
      const ar = Ar[r][col], ai = Ai[r][col];
      const fr = (ar * dr + ai * di) / dd, fi = (ai * dr - ar * di) / dd;
      if (fr === 0 && fi === 0) continue;
      for (let c = col; c < n; c++) {
        Ar[r][c] -= fr * Ar[col][c] - fi * Ai[col][c];
        Ai[r][c] -= fr * Ai[col][c] + fi * Ar[col][c];
      }
      zr[r] -= fr * zr[col] - fi * zi[col];
      zi[r] -= fr * zi[col] + fi * zr[col];
    }
  }
  const re = new Array(n).fill(0), im = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const dr = Ar[i][i], di = Ai[i][i], dd = dr * dr + di * di;
    if (dd < 1e-30) continue;
    re[i] = (zr[i] * dr + zi[i] * di) / dd;
    im[i] = (zi[i] * dr - zr[i] * di) / dd;
  }
  return { re, im };
}

// ---------- Транзиентный анализ (backward Euler) ----------
export interface TranOpts {
  numNodes: number;
  ground: number;          // индекс узла-земли
  input: number;           // узел + источника
  stimulus: (t: number) => number; // напряжение источника, В
  elems: Elem[];
  tEnd: number; steps: number;
}
export interface TranResult { t: number[]; v: number[][]; } // v[node][i]

export function transient(o: TranOpts): TranResult {
  const { numNodes, ground, input, stimulus, elems, tEnd, steps } = o;
  const dt = tEnd / steps;
  // Перенумерация: ground → -1 (опорный), остальные 0..N-1.
  const remap = new Array(numNodes).fill(-1);
  let N = 0;
  for (let i = 0; i < numNodes; i++) if (i !== ground) remap[i] = N++;
  const inN = remap[input];
  const inductors = elems.filter((e) => e.kind === "L");
  const M = 1 + inductors.length;       // ветви: источник + катушки
  const sz = N + M;
  const ix = (n: number) => remap[n];

  const vc = new Map<string, number>();     // напряжение на конденсаторе (пред. шаг)
  const il = new Map<string, number>();     // ток катушки (пред. шаг)
  for (const e of elems) { if (e.kind === "C") vc.set(e.ref, 0); if (e.kind === "L") il.set(e.ref, 0); }

  const t: number[] = [], v: number[][] = Array.from({ length: numNodes }, () => []);
  for (let s = 0; s <= steps; s++) {
    const time = s * dt;
    const A = Array.from({ length: sz }, () => new Array(sz).fill(0));
    const z = new Array(sz).fill(0);
    const stampG = (a: number, b: number, g: number) => {
      const ia = ix(a), ib = ix(b);
      if (ia >= 0) A[ia][ia] += g;
      if (ib >= 0) A[ib][ib] += g;
      if (ia >= 0 && ib >= 0) { A[ia][ib] -= g; A[ib][ia] -= g; }
    };
    const stampI = (a: number, b: number, cur: number) => { // ток a→b
      const ia = ix(a), ib = ix(b);
      if (ia >= 0) z[ia] -= cur;
      if (ib >= 0) z[ib] += cur;
    };
    for (const e of elems) {
      if (e.kind === "R") stampG(e.a, e.b, 1 / e.value);
      else if (e.kind === "C") {
        const geq = e.value / dt, ieq = geq * (vc.get(e.ref) ?? 0);
        stampG(e.a, e.b, geq);
        stampI(e.a, e.b, -ieq);   // источник тока ieq течёт a→b (поддерживает заряд)
      }
    }
    // Катушки — ветви с током-неизвестной (Req = L/dt, Veq = Req·Iprev).
    let br = N;
    for (const e of inductors) {
      const r = br++, ia = ix(e.a), ib = ix(e.b);
      const req = e.value / dt, veq = req * (il.get(e.ref) ?? 0);
      if (ia >= 0) { A[ia][r] += 1; A[r][ia] += 1; }
      if (ib >= 0) { A[ib][r] -= 1; A[r][ib] -= 1; }
      A[r][r] -= req;
      z[r] = veq;
    }
    // Источник напряжения input→ground.
    const vr = br++;
    if (inN >= 0) { A[inN][vr] += 1; A[vr][inN] += 1; }
    z[vr] = stimulus(time);

    const x = solveReal(A, z);
    for (let n = 0; n < numNodes; n++) v[n].push(n === ground ? 0 : x[ix(n)]);
    // обновляем состояние реактивных элементов
    const vAt = (n: number) => (n === ground ? 0 : x[ix(n)]);
    for (const e of elems) if (e.kind === "C") vc.set(e.ref, vAt(e.a) - vAt(e.b));
    br = N;
    for (const e of inductors) il.set(e.ref, x[br++]);
    t.push(time);
  }
  return { t, v };
}

// ---------- DC operating point (C — обрыв, L — короткое) ----------
export interface DcOpts { numNodes: number; ground: number; input: number; vsrc: number; elems: Elem[]; }
export function dcSolve(o: DcOpts): number[] {
  const { numNodes, ground, input, vsrc, elems } = o;
  const remap = new Array(numNodes).fill(-1);
  let N = 0;
  for (let i = 0; i < numNodes; i++) if (i !== ground) remap[i] = N++;
  const ix = (n: number) => remap[n];
  const inN = remap[input];
  const sz = N + 1;
  const A = Array.from({ length: sz }, () => new Array(sz).fill(0));
  const z = new Array(sz).fill(0);
  const stampG = (a: number, b: number, g: number) => {
    const ia = ix(a), ib = ix(b);
    if (ia >= 0) A[ia][ia] += g;
    if (ib >= 0) A[ib][ib] += g;
    if (ia >= 0 && ib >= 0) { A[ia][ib] -= g; A[ib][ia] -= g; }
  };
  for (const e of elems) {
    if (e.kind === "R") stampG(e.a, e.b, 1 / e.value);
    else if (e.kind === "L") stampG(e.a, e.b, 1e9); // короткое
    // C — обрыв (не стампим)
  }
  const vr = N;
  if (inN >= 0) { A[inN][vr] += 1; A[vr][inN] += 1; }
  z[vr] = vsrc;
  const x = solveReal(A, z);
  const out = new Array(numNodes).fill(0);
  for (let n = 0; n < numNodes; n++) out[n] = n === ground ? 0 : x[ix(n)];
  return out;
}

// ---------- AC-анализ (комплексный MNA, свип частоты) ----------
export interface AcOpts {
  numNodes: number; ground: number; input: number; probe: number;
  elems: Elem[];
  fStart: number; fStop: number; points: number;
}
export interface AcResult { f: number[]; magDb: number[]; phaseDeg: number[]; }

export function acSweep(o: AcOpts): AcResult {
  const { numNodes, ground, input, probe, elems, fStart, fStop, points } = o;
  const remap = new Array(numNodes).fill(-1);
  let N = 0;
  for (let i = 0; i < numNodes; i++) if (i !== ground) remap[i] = N++;
  const ix = (n: number) => remap[n];
  const inN = remap[input], probeN = remap[probe];
  const inductors = elems.filter((e) => e.kind === "L");
  const M = 1 + inductors.length, sz = N + M;

  const f: number[] = [], magDb: number[] = [], phaseDeg: number[] = [];
  const loglo = Math.log10(Math.max(1e-6, fStart)), loghi = Math.log10(Math.max(fStart * 1.0001, fStop));
  for (let p = 0; p < points; p++) {
    const freq = Math.pow(10, loglo + (loghi - loglo) * (points === 1 ? 0 : p / (points - 1)));
    const w = 2 * Math.PI * freq;
    const Ar = Array.from({ length: sz }, () => new Array(sz).fill(0));
    const Ai = Array.from({ length: sz }, () => new Array(sz).fill(0));
    const zr = new Array(sz).fill(0), zi = new Array(sz).fill(0);
    const stampY = (a: number, b: number, gr: number, gi: number) => {
      const ia = ix(a), ib = ix(b);
      if (ia >= 0) { Ar[ia][ia] += gr; Ai[ia][ia] += gi; }
      if (ib >= 0) { Ar[ib][ib] += gr; Ai[ib][ib] += gi; }
      if (ia >= 0 && ib >= 0) { Ar[ia][ib] -= gr; Ai[ia][ib] -= gi; Ar[ib][ia] -= gr; Ai[ib][ia] -= gi; }
    };
    for (const e of elems) {
      if (e.kind === "R") stampY(e.a, e.b, 1 / e.value, 0);
      else if (e.kind === "C") stampY(e.a, e.b, 0, w * e.value); // Y = jωC
    }
    let br = N;
    for (const e of inductors) {
      const r = br++, ia = ix(e.a), ib = ix(e.b);
      if (ia >= 0) { Ar[ia][r] += 1; Ar[r][ia] += 1; }
      if (ib >= 0) { Ar[ib][r] -= 1; Ar[r][ib] -= 1; }
      Ai[r][r] -= w * e.value;  // V = jωL·I → строка: Va-Vb - jωL·I = 0
    }
    const vr = br++;
    if (inN >= 0) { Ar[inN][vr] += 1; Ar[vr][inN] += 1; }
    zr[vr] = 1; // 1 В AC
    const { re, im } = solveComplex(Ar, Ai, zr, zi);
    const pr = probeN >= 0 ? re[probeN] : 0, pi = probeN >= 0 ? im[probeN] : 0;
    const mag = Math.hypot(pr, pi);
    f.push(freq);
    magDb.push(20 * Math.log10(Math.max(1e-12, mag)));
    phaseDeg.push(Math.atan2(pi, pr) * 180 / Math.PI);
  }
  return { f, magDb, phaseDeg };
}
