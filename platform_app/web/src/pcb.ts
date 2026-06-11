// ============================================================
// PCB — чистая геометрия и фаб-выходы (без React):
//   • clearance-DRC: зазоры дорожка-дорожка / дорожка-пад / пад-пад;
//   • copper pour: заливка полигона цепи растровыми полосами;
//   • Gerber RS-274X (медь + регионы заливки), Edge.Cuts, F.Silkscreen,
//     Excellon drill, pick-and-place CSV.
// Координаты — px сцены PCB (4 px = 1 мм), Y вниз; плата от (40,40).
// ============================================================

export const PX_PER_MM = 4;
export const BOARD_X0 = 40, BOARD_Y0 = 40;
export const SCENE_H = 340;            // высота сцены (для Y-флипа Gerber)
export const TRACK_W = 3.5;            // ширина дорожки, px (~0.9 мм)
export const PAD_HALF = 5;             // полуразмер пада, px (10×10)

export interface Pt { x: number; y: number; }
export interface BoardRect { x0: number; y0: number; x1: number; y1: number; }

export function boardRect(board?: { w: number; h: number }): BoardRect {
  const w = (board?.w ?? 90) * PX_PER_MM, h = (board?.h ?? 65) * PX_PER_MM;
  return { x0: BOARD_X0, y0: BOARD_Y0, x1: BOARD_X0 + w, y1: BOARD_Y0 + h };
}

// ---------- Геометрия ----------
export function segPtDist(a: Pt, b: Pt, p: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function segsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const cross = (o: Pt, p: Pt, q: Pt) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

export function segSegDist(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (segsIntersect(a, b, c, d)) return 0;
  return Math.min(segPtDist(a, b, c), segPtDist(a, b, d), segPtDist(c, d, a), segPtDist(c, d, b));
}

// Ближайшая точка между сегментами — для маркера нарушения (приближённо).
function segSegNear(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const cand: [number, Pt][] = [
    [segPtDist(a, b, c), c], [segPtDist(a, b, d), d],
    [segPtDist(c, d, a), a], [segPtDist(c, d, b), b],
  ];
  cand.sort((p, q) => p[0] - q[0]);
  return cand[0][1];
}

// ---------- Clearance-DRC ----------
export interface PadGeo { id: string; x: number; y: number; half: number; net: string; }
export interface TrackGeo { sig: string; layer: "F" | "B"; points: Pt[]; net: string; w: number; }

export interface Violation {
  kind: "track-track" | "track-pad" | "pad-pad";
  a: string; b: string;          // подписи объектов
  x: number; y: number;          // маркер на сцене
  gap: number;                   // зазор по краям, px (<0 — пересечение)
}

// Зазор по краям: расстояние центров минус полуширины. Пады считаются
// кругами r=half (приближение для квадратных падов). Сквозные пады
// проверяются против обоих слоёв.
export function clearanceDrc(tracks: TrackGeo[], pads: PadGeo[], clearancePx: number): Violation[] {
  const out: Violation[] = [];
  const differentNets = (a: string, b: string) => a !== b || (a === "" && b === "");
  // дорожка-дорожка (один слой)
  for (let i = 0; i < tracks.length; i++) for (let j = i + 1; j < tracks.length; j++) {
    const t1 = tracks[i], t2 = tracks[j];
    if (t1.layer !== t2.layer || !differentNets(t1.net, t2.net)) continue;
    let best = Infinity, at: Pt = t1.points[0];
    for (let s1 = 0; s1 + 1 < t1.points.length; s1++) for (let s2 = 0; s2 + 1 < t2.points.length; s2++) {
      const d = segSegDist(t1.points[s1], t1.points[s1 + 1], t2.points[s2], t2.points[s2 + 1]);
      if (d < best) { best = d; at = segSegNear(t1.points[s1], t1.points[s1 + 1], t2.points[s2], t2.points[s2 + 1]); }
    }
    const gap = best - (t1.w + t2.w) / 2;
    if (gap < clearancePx) out.push({ kind: "track-track", a: t1.sig, b: t2.sig, x: at.x, y: at.y, gap });
  }
  // дорожка-пад (пады сквозные → оба слоя)
  for (const t of tracks) for (const p of pads) {
    if (!differentNets(t.net, p.net)) continue;
    let best = Infinity;
    for (let s = 0; s + 1 < t.points.length; s++) best = Math.min(best, segPtDist(t.points[s], t.points[s + 1], p));
    const gap = best - t.w / 2 - p.half;
    if (gap < clearancePx) out.push({ kind: "track-pad", a: t.sig, b: p.id, x: p.x, y: p.y, gap });
  }
  // пад-пад
  for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) {
    const p1 = pads[i], p2 = pads[j];
    if (!differentNets(p1.net, p2.net)) continue;
    const gap = Math.hypot(p1.x - p2.x, p1.y - p2.y) - p1.half - p2.half;
    if (gap < clearancePx) out.push({ kind: "pad-pad", a: p1.id, b: p2.id, x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, gap });
  }
  return out;
}

// ---------- Copper pour (заливка цепи) ----------
// Растеризация полосами step px: из каждой строки вычитаются чужие пады и
// дорожки, раздутые на clearance; пады/дорожки своей цепи не вычитаются
// (прямое подключение, без термобарьеров — ограничение зафиксировано).
export interface PourOpts {
  board: BoardRect; net: string;
  tracks: TrackGeo[]; pads: PadGeo[];
  clearancePx: number; margin?: number; step?: number;
}

export function buildPour(o: PourOpts): BoardRect[] {
  const margin = o.margin ?? 2, step = o.step ?? 4;
  const x0 = o.board.x0 + margin, x1 = o.board.x1 - margin;
  const strips: BoardRect[] = [];
  for (let y = o.board.y0 + margin; y + step <= o.board.y1 - margin; y += step) {
    const yMid = y + step / 2;
    const blocked: [number, number][] = [];
    for (const p of o.pads) {
      if (p.net === o.net && p.net !== "") continue;
      const r = p.half + o.clearancePx;
      if (Math.abs(p.y - yMid) <= r + step / 2) blocked.push([p.x - r, p.x + r]);
    }
    for (const t of o.tracks) {
      if (t.layer !== "F") continue;                      // заливка на F.Cu
      if (t.net === o.net && t.net !== "") continue;
      const r = t.w / 2 + o.clearancePx;
      for (let s = 0; s + 1 < t.points.length; s++) {
        const a = t.points[s], b = t.points[s + 1];
        const ylo = Math.min(a.y, b.y) - r, yhi = Math.max(a.y, b.y) + r;
        if (yhi < y || ylo > y + step) continue;
        blocked.push([Math.min(a.x, b.x) - r, Math.max(a.x, b.x) + r]);
      }
    }
    // объединяем интервалы и собираем свободные куски
    blocked.sort((a, b) => a[0] - b[0]);
    let cur = x0;
    const free: [number, number][] = [];
    for (const [bx0, bx1] of blocked) {
      if (bx1 < cur) continue;
      if (bx0 > cur) free.push([cur, Math.min(bx0, x1)]);
      cur = Math.max(cur, bx1);
      if (cur >= x1) break;
    }
    if (cur < x1) free.push([cur, x1]);
    for (const [fx0, fx1] of free) if (fx1 - fx0 >= step) strips.push({ x0: fx0, y0: y, x1: fx1, y1: y + step });
  }
  return strips;
}

// ---------- Gerber / Drill / PnP ----------
const k = (px: number) => Math.round((px / PX_PER_MM) * 10000); // px → мм с 4 знаками
const gx = (x: number) => k(x);
const gy = (y: number) => k(SCENE_H - y);                       // Y-флип

// Медный слой: флэши падов + дорожки + регионы заливки (G36/G37).
export function buildCopperGerber(o: { pads: Pt[]; paths: Pt[][]; pour?: BoardRect[] }): string {
  const L: string[] = ["%FSLAX34Y34*%", "%MOMM*%", "%ADD10C,1.50000*%", "%ADD12C,0.90000*%", "G01*"];
  if (o.paths.length) {
    L.push("D12*");
    for (const path of o.paths)
      path.forEach((p, i) => L.push(`X${gx(p.x)}Y${gy(p.y)}D0${i === 0 ? 2 : 1}*`));
  }
  for (const r of o.pour ?? []) {
    L.push("G36*");
    L.push(`X${gx(r.x0)}Y${gy(r.y0)}D02*`);
    L.push(`X${gx(r.x1)}Y${gy(r.y0)}D01*`);
    L.push(`X${gx(r.x1)}Y${gy(r.y1)}D01*`);
    L.push(`X${gx(r.x0)}Y${gy(r.y1)}D01*`);
    L.push(`X${gx(r.x0)}Y${gy(r.y0)}D01*`);
    L.push("G37*");
  }
  L.push("D10*");
  for (const p of o.pads) L.push(`X${gx(p.x)}Y${gy(p.y)}D03*`);
  L.push("M02*");
  return L.join("\n");
}

// Контур платы (Edge.Cuts).
export function buildEdgeGerber(b: BoardRect): string {
  const L: string[] = ["%FSLAX34Y34*%", "%MOMM*%", "%ADD10C,0.10000*%", "G01*", "D10*"];
  const pts: Pt[] = [
    { x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }, { x: b.x0, y: b.y0 },
  ];
  pts.forEach((p, i) => L.push(`X${gx(p.x)}Y${gy(p.y)}D0${i === 0 ? 2 : 1}*`));
  L.push("M02*");
  return L.join("\n");
}

// Шелкография: рамки корпусов + маркер первого пина.
// Ограничение: ref-текст не выводится (нет векторного шрифта).
export interface SilkFp { x0: number; y0: number; x1: number; y1: number; pin1: Pt; }
export function buildSilkGerber(fps: SilkFp[]): string {
  const L: string[] = ["%FSLAX34Y34*%", "%MOMM*%", "%ADD10C,0.15000*%", "%ADD11C,0.60000*%", "G01*"];
  L.push("D10*");
  for (const f of fps) {
    const pts: Pt[] = [
      { x: f.x0, y: f.y0 }, { x: f.x1, y: f.y0 }, { x: f.x1, y: f.y1 }, { x: f.x0, y: f.y1 }, { x: f.x0, y: f.y0 },
    ];
    pts.forEach((p, i) => L.push(`X${gx(p.x)}Y${gy(p.y)}D0${i === 0 ? 2 : 1}*`));
  }
  L.push("D11*");
  for (const f of fps) L.push(`X${gx(f.pin1.x)}Y${gy(f.pin1.y)}D03*`);
  L.push("M02*");
  return L.join("\n");
}

// Excellon drill: отверстия падов (металлизированные, служат переходами).
export function buildDrill(pads: Pt[]): string {
  const mm = (px: number) => (px / PX_PER_MM).toFixed(3);
  const L: string[] = ["M48", "FMAT,2", "METRIC", "T1C0.800", "%", "G90", "T1"];
  for (const p of pads) L.push(`X${mm(p.x)}Y${mm(SCENE_H - p.y)}`);
  L.push("M30");
  return L.join("\n");
}

// Pick-and-place CSV (KiCad-формат): мм от левого нижнего угла платы.
export interface PnpRow { ref: string; value: string; footprint: string; x: number; y: number; rot: number; }
export function buildPnp(rows: PnpRow[], b: BoardRect): string {
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const lines = ["Ref,Val,Package,PosX,PosY,Rot,Side"];
  for (const r of rows) {
    const px = ((r.x - b.x0) / PX_PER_MM).toFixed(3);
    const py = ((b.y1 - r.y) / PX_PER_MM).toFixed(3);
    lines.push([esc(r.ref), esc(r.value), esc(r.footprint), px, py, String(r.rot), "top"].join(","));
  }
  return lines.join("\n");
}
