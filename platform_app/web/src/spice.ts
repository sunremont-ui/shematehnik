// ============================================================
// SPICE — узловой анализ (MNA) поверх реальной топологии схемы.
// Узлы берутся из цепей проекта (провода + net-метки), номиналы R/C/L
// парсятся из value. Возбуждение (источник) задаётся в панели анализа —
// как .tran/.ac директива, ссылающаяся на источник между двумя узлами.
//   • DC   — рабочая точка (C — обрыв, L — короткое) + Ньютон-Рафсон.
//   • SWEEP — развёртка DC-источника, V(probe) от Vsrc.
//   • TRAN — backward-Euler companion-модели C/L, шаг по времени.
//   • AC   — комплексный MNA на сетке частот → Боде (|H| дБ, фаза);
//            нелинейные приборы линеаризуются в DC-рабочей точке.
// Нелинейные приборы (Ньютон-Рафсон, companion-модели):
//   D — Шокли (LED: n=2, Is=1e-18), Q — БЮТ Эберс-Молл (транспортная,
//   βF=100, βR=1), M — MOSFET level 1 (K=0.1, Vth=2). NPN/N-MOS pol=+1,
//   PNP/P-MOS pol=−1. Узлы Q/M: a=коллектор/сток, b=эмиттер/исток,
//   c=база/затвор (пины компонента: 1=Б/З, 2=К/С, 3=Э/И).
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
export type ElemKind = "R" | "C" | "L" | "D" | "Q" | "M";
export interface Elem {
  ref: string; kind: ElemKind;
  a: number; b: number;          // D: a=анод, b=катод; Q/M: a=коллектор/сток, b=эмиттер/исток
  value: number;                 // номинал R/C/L (для D/Q/M не используется)
  c?: number;                    // Q/M: база/затвор
  pol?: 1 | -1;                  // NPN/N-MOS = +1, PNP/P-MOS = −1
  dm?: { is: number; n: number };// модель диода
}

export function buildElements(p: UcpProject, nodes: NodeModel): Elem[] {
  const out: Elem[] = [];
  for (const c of p.components) {
    const node = (pin: string) => nodes.nodeOf.get(`${c.ref}.${pin}`);
    if (c.kind === "R" || c.kind === "C" || c.kind === "L") {
      const a = node("1"), b = node("2");
      if (a == null || b == null) continue;
      const value = parseValue(c.value);
      if (!(value > 0)) continue;
      out.push({ ref: c.ref, kind: c.kind, a, b, value });
    } else if (c.kind === "D") {
      const a = node("1"), b = node("2");
      if (a == null || b == null) continue;
      const led = /led/i.test(c.value);
      out.push({ ref: c.ref, kind: "D", a, b, value: 0, dm: led ? { is: 1e-18, n: 2 } : { is: 1e-14, n: 1 } });
    } else if (c.kind === "Q") {
      // пины: 1=база/затвор, 2=коллектор/сток, 3=эмиттер/исток
      const g = node("1"), d = node("2"), s = node("3");
      if (g == null || d == null || s == null) continue;
      const v = c.value;
      const isMos = /mos|irf|irlz|7000|ao3/i.test(v);
      const isP = /irf9|pnp|2907|pmos|p-mos|bc557|s8550/i.test(v);
      out.push({ ref: c.ref, kind: isMos ? "M" : "Q", a: d, b: s, c: g, value: 0, pol: isP ? -1 : 1 });
    }
  }
  return out;
}

export const hasNonlinear = (elems: Elem[]) => elems.some((e) => e.kind === "D" || e.kind === "Q" || e.kind === "M");

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

// ---------- Нелинейные приборы (ток + якобиан на терминалах) ----------
const VT = 0.02585;      // тепловой потенциал, В
const GMIN = 1e-12;      // утечка для сходимости

// Диод Шокли с продолжением экспоненты (защита от переполнения).
function diodeIV(v: number, is: number, nVt: number): { i: number; g: number } {
  const CAP = 80, x = v / nVt;
  if (x > CAP) {
    const e = Math.exp(CAP), g = (is / nVt) * e;
    return { i: is * (e - 1) + g * (v - CAP * nVt) + GMIN * v, g: g + GMIN };
  }
  const e = Math.exp(x);
  return { i: is * (e - 1) + GMIN * v, g: (is / nVt) * e + GMIN };
}

interface NlEval { terms: number[]; I: number[]; J: number[][]; }

// БЮТ — транспортная модель Эберса-Молла. Терминалы [коллектор, база, эмиттер].
// PNP: I(V) = −I_npn(−V) → токи ·pol, якобиан не меняется (вычислен в штрихованных V).
function bjtEval(vc: number, vb: number, ve: number, pol: 1 | -1): { I: number[]; J: number[][] } {
  const IS = 1e-14, BF = 100, BR = 1;
  const vbe = pol * (vb - ve), vbc = pol * (vb - vc);
  const dbe = diodeIV(vbe, IS, VT), dbc = diodeIV(vbc, IS, VT);
  const ic = dbe.i - dbc.i - dbc.i / BR;
  const ib = dbe.i / BF + dbc.i / BR;
  const dicBe = dbe.g, dicBc = -dbc.g * (1 + 1 / BR);
  const dibBe = dbe.g / BF, dibBc = dbc.g / BR;
  // производные по узлам [c, b, e]: vbe' = vb−ve, vbc' = vb−vc (pol² = 1)
  const Jc = [-dicBc, dicBe + dicBc, -dicBe];
  const Jb = [-dibBc, dibBe + dibBc, -dibBe];
  const Je = Jc.map((x, i) => -(x + Jb[i]));
  return { I: [pol * ic, pol * ib, pol * (-ic - ib)], J: [Jc, Jb, Je] };
}

// MOSFET level 1 (квадратичный). Терминалы [сток, затвор, исток]; канал
// симметричен — при Vds<0 роли стока/истока меняются местами.
function mosEval(vdN: number, vgN: number, vsN: number, pol: 1 | -1): { I: number[]; J: number[][] } {
  const K = 0.1, VTH = 2;
  const vd = pol * vdN, vg = pol * vgN, vs = pol * vsN;
  const swap = vd < vs;
  const vT = swap ? vs : vd, vB = swap ? vd : vs;   // верх/низ канала
  const vgs = vg - vB, vds = vT - vB, vov = vgs - VTH;
  let id: number, gm: number, gds: number;
  if (vov <= 0) { id = GMIN * vds; gm = 0; gds = GMIN; }
  else if (vds < vov) { id = K * (vov * vds - vds * vds / 2) + GMIN * vds; gm = K * vds; gds = K * (vov - vds) + GMIN; }
  else { id = (K / 2) * vov * vov + GMIN * vds; gm = K * vov; gds = GMIN; }
  // в штрихованном пространстве, порядок [T, g, B]
  const I3 = [pol * id, 0, pol * -id];
  const JT = [gds, gm, -gds - gm];
  const J3 = [JT, [0, 0, 0], JT.map((x) => -x)];
  if (!swap) return { I: I3, J: J3 };
  // обмен ролями строк/столбцов 0↔2 → физический порядок [d, g, s]
  const pi = [2, 1, 0];
  return {
    I: pi.map((i) => I3[i]),
    J: pi.map((i) => pi.map((j) => J3[i][j])),
  };
}

function evalNonlinear(e: Elem, vAt: (n: number) => number): NlEval | null {
  if (e.kind === "D") {
    const m = e.dm ?? { is: 1e-14, n: 1 };
    const { i, g } = diodeIV(vAt(e.a) - vAt(e.b), m.is, m.n * VT);
    return { terms: [e.a, e.b], I: [i, -i], J: [[g, -g], [-g, g]] };
  }
  if (e.kind === "Q") {
    const { I, J } = bjtEval(vAt(e.a), vAt(e.c!), vAt(e.b), e.pol ?? 1);
    return { terms: [e.a, e.c!, e.b], I, J };
  }
  if (e.kind === "M") {
    const { I, J } = mosEval(vAt(e.a), vAt(e.c!), vAt(e.b), e.pol ?? 1);
    return { terms: [e.a, e.c!, e.b], I, J };
  }
  return null;
}

// Стамп нелинейных приборов, линеаризованных в точке x (узловые напряжения):
// companion: i(v) ≈ I(x) + J·(v − x) → G-стамп J и источник тока I − J·x.
function stampNonlinear(A: number[][], z: number[], ix: (n: number) => number, x: number[], elems: Elem[]) {
  for (const e of elems) {
    const ev = evalNonlinear(e, (n) => x[n]);
    if (!ev) continue;
    const { terms, I, J } = ev;
    for (let r = 0; r < terms.length; r++) {
      const tr = ix(terms[r]);
      let rhs = I[r];
      for (let c = 0; c < terms.length; c++) {
        rhs -= J[r][c] * x[terms[c]];
        const tc = ix(terms[c]);
        if (tr >= 0 && tc >= 0) A[tr][tc] += J[r][c];
      }
      if (tr >= 0) z[tr] -= rhs;
    }
  }
}

// Ньютон-Рафсон вокруг линейной сборки. assemble заполняет свежие A,z
// линейной частью; решение демпфируется шагом ±0.5 В (источники V при этом
// держатся своими строками-ограничениями, демпфинг влияет только на точку
// линеаризации). Возвращает узловые напряжения и полный вектор решения
// (ветвевые токи нужны транзиенту).
function nrSolve(
  numNodes: number, ground: number, sz: number, ix: (n: number) => number,
  assemble: (A: number[][], z: number[]) => void,
  elems: Elem[], x0?: number[],
): { x: number[]; sol: number[] } {
  let x = x0 ? x0.slice() : new Array(numNodes).fill(0);
  const nl = hasNonlinear(elems);
  const maxIter = nl ? 200 : 1;
  let sol: number[] = [];
  let xn: number[] = x;
  for (let iter = 0; iter < maxIter; iter++) {
    const A = Array.from({ length: sz }, () => new Array(sz).fill(0));
    const z = new Array(sz).fill(0);
    assemble(A, z);
    if (nl) stampNonlinear(A, z, ix, x, elems);
    sol = solveReal(A, z);
    xn = new Array(numNodes).fill(0);
    for (let n = 0; n < numNodes; n++) xn[n] = n === ground ? 0 : sol[ix(n)];
    if (!nl) break;
    let dmax = 0;
    for (let n = 0; n < numNodes; n++) dmax = Math.max(dmax, Math.abs(xn[n] - x[n]));
    if (dmax < 1e-6) break;
    for (let n = 0; n < numNodes; n++) x[n] += Math.max(-0.5, Math.min(0.5, xn[n] - x[n]));
  }
  return { x: xn, sol };
}

// Перенумерация: ground → -1 (опорный), остальные 0..N-1.
function remapNodes(numNodes: number, ground: number): { ix: (n: number) => number; N: number } {
  const remap = new Array(numNodes).fill(-1);
  let N = 0;
  for (let i = 0; i < numNodes; i++) if (i !== ground) remap[i] = N++;
  return { ix: (n: number) => remap[n], N };
}

// Дополнительный независимый источник напряжения (относительно ground).
export interface VSrc { p: number; v: number; }

// ---------- DC operating point (C — обрыв, L — короткое) ----------
export interface DcOpts { numNodes: number; ground: number; input: number; vsrc: number; aux?: VSrc[]; elems: Elem[]; }
export function dcSolve(o: DcOpts): number[] {
  const { numNodes, ground, input, vsrc, elems } = o;
  const aux = o.aux ?? [];
  const { ix, N } = remapNodes(numNodes, ground);
  const sz = N + 1 + aux.length;
  const assemble = (A: number[][], z: number[]) => {
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
    let vr = N;
    for (const s of [{ p: input, v: vsrc }, ...aux]) {
      const ip = ix(s.p);
      if (ip >= 0) { A[ip][vr] += 1; A[vr][ip] += 1; }
      z[vr] = s.v;
      vr++;
    }
  };
  return nrSolve(numNodes, ground, sz, ix, assemble, elems).x;
}

// ---------- DC sweep: развёртка источника, V(probe) от Vsrc ----------
export interface SweepOpts {
  numNodes: number; ground: number; input: number; probe: number;
  aux?: VSrc[]; elems: Elem[];
  from: number; to: number; steps: number;
}
export interface SweepResult { x: number[]; v: number[]; }
export function dcSweep(o: SweepOpts): SweepResult {
  const x: number[] = [], v: number[] = [];
  for (let s = 0; s <= o.steps; s++) {
    const vsrc = o.from + (o.to - o.from) * (s / o.steps);
    const sol = dcSolve({ numNodes: o.numNodes, ground: o.ground, input: o.input, vsrc, aux: o.aux, elems: o.elems });
    x.push(vsrc);
    v.push(sol[o.probe]);
  }
  return { x, v };
}

// ---------- Транзиентный анализ (backward Euler) ----------
export interface TranOpts {
  numNodes: number;
  ground: number;          // индекс узла-земли
  input: number;           // узел + источника
  stimulus: (t: number) => number; // напряжение источника, В
  aux?: VSrc[];            // дополнительные DC-источники (питание)
  elems: Elem[];
  tEnd: number; steps: number;
}
export interface TranResult { t: number[]; v: number[][]; } // v[node][i]

export function transient(o: TranOpts): TranResult {
  const { numNodes, ground, input, stimulus, elems, tEnd, steps } = o;
  const aux = o.aux ?? [];
  const dt = tEnd / steps;
  const { ix, N } = remapNodes(numNodes, ground);
  const inductors = elems.filter((e) => e.kind === "L");
  const sz = N + inductors.length + 1 + aux.length;

  const vc = new Map<string, number>();     // напряжение на конденсаторе (пред. шаг)
  const il = new Map<string, number>();     // ток катушки (пред. шаг)
  for (const e of elems) { if (e.kind === "C") vc.set(e.ref, 0); if (e.kind === "L") il.set(e.ref, 0); }

  const t: number[] = [], v: number[][] = Array.from({ length: numNodes }, () => []);
  let xPrev: number[] | undefined;
  for (let s = 0; s <= steps; s++) {
    const time = s * dt;
    const assemble = (A: number[][], z: number[]) => {
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
      // Источники напряжения: стимул input→ground + дополнительные DC.
      for (const src of [{ p: input, v: stimulus(time) }, ...aux]) {
        const r = br++, ip = ix(src.p);
        if (ip >= 0) { A[ip][r] += 1; A[r][ip] += 1; }
        z[r] = src.v;
      }
    };
    const { x, sol } = nrSolve(numNodes, ground, sz, ix, assemble, elems, xPrev);
    xPrev = x; // тёплый старт следующего шага
    for (let n = 0; n < numNodes; n++) v[n].push(x[n]);
    // обновляем состояние реактивных элементов
    for (const e of elems) if (e.kind === "C") vc.set(e.ref, x[e.a] - x[e.b]);
    let br = N;
    for (const e of inductors) il.set(e.ref, sol[br++]);
    t.push(time);
  }
  return { t, v };
}

// ---------- AC-анализ (комплексный MNA, свип частоты) ----------
export interface AcOpts {
  numNodes: number; ground: number; input: number; probe: number;
  aux?: VSrc[];            // доп. источники: по AC закорочены на землю
  elems: Elem[];
  bias?: number[];         // DC-рабочая точка для линеаризации D/Q/M
  fStart: number; fStop: number; points: number;
}
export interface AcResult { f: number[]; magDb: number[]; phaseDeg: number[]; }

export function acSweep(o: AcOpts): AcResult {
  const { numNodes, ground, input, probe, elems, fStart, fStop, points } = o;
  const aux = o.aux ?? [];
  const { ix, N } = remapNodes(numNodes, ground);
  const inN = ix(input), probeN = ix(probe);
  const inductors = elems.filter((e) => e.kind === "L");
  const sz = N + inductors.length + 1 + aux.length;

  // Малосигнальные проводимости нелинейных приборов в рабочей точке.
  const bias = o.bias ?? new Array(numNodes).fill(0);
  const nlStamps: { terms: number[]; J: number[][] }[] = [];
  for (const e of elems) {
    const ev = evalNonlinear(e, (n) => bias[n]);
    if (ev) nlStamps.push({ terms: ev.terms, J: ev.J });
  }

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
    for (const { terms, J } of nlStamps) {
      for (let r = 0; r < terms.length; r++) {
        const tr = ix(terms[r]); if (tr < 0) continue;
        for (let c = 0; c < terms.length; c++) {
          const tc = ix(terms[c]); if (tc < 0) continue;
          Ar[tr][tc] += J[r][c];
        }
      }
    }
    let br = N;
    for (const e of inductors) {
      const r = br++, ia = ix(e.a), ib = ix(e.b);
      if (ia >= 0) { Ar[ia][r] += 1; Ar[r][ia] += 1; }
      if (ib >= 0) { Ar[ib][r] -= 1; Ar[r][ib] -= 1; }
      Ai[r][r] -= w * e.value;  // V = jωL·I → строка: Va-Vb - jωL·I = 0
    }
    // Источник AC 1 В + доп. источники (AC-земля).
    {
      const r = br++;
      if (inN >= 0) { Ar[inN][r] += 1; Ar[r][inN] += 1; }
      zr[r] = 1;
    }
    for (const s of aux) {
      const r = br++, ip = ix(s.p);
      if (ip >= 0) { Ar[ip][r] += 1; Ar[r][ip] += 1; }
      // z = 0 — источник питания по переменному току закорочен
    }
    const { re, im } = solveComplex(Ar, Ai, zr, zi);
    const pr = probeN >= 0 ? re[probeN] : 0, pi = probeN >= 0 ? im[probeN] : 0;
    const mag = Math.hypot(pr, pi);
    f.push(freq);
    magDb.push(20 * Math.log10(Math.max(1e-12, mag)));
    phaseDeg.push(Math.atan2(pi, pr) * 180 / Math.PI);
  }
  return { f, magDb, phaseDeg };
}
