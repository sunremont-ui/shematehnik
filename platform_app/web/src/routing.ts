// ============================================================
// Ортогональный роутер с объездом препятствий (A* по сетке).
// Используется для разводки проводов схемы вокруг корпусов компонентов.
// ============================================================
export interface Pt { x: number; y: number; }
export interface Rect { x0: number; y0: number; x1: number; y1: number; }

const G = 8;        // шаг сетки, px
const PAD = 4;      // зазор вокруг препятствий
const MARGIN = 48;  // запас области поиска
const TURN = 6;     // штраф за поворот (любим прямые линии)

// Бинарная куча (минимум по f).
class Heap {
  private a: { k: number; f: number }[] = [];
  push(k: number, f: number) { const a = this.a; a.push({ k, f }); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop(): number | undefined { const a = this.a; if (!a.length) return undefined; const top = a[0]; const last = a.pop()!; if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top.k; }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Маршрут с флагом успеха: found=false → объезд невозможен (вернётся L-обход).
export function routeOrthogonalEx(a: Pt, b: Pt, obstacles: Rect[]): { path: Pt[]; found: boolean } {
  return routeCore(a, b, obstacles);
}

// Маршрут от a до b ортогональными сегментами, объезжая obstacles.
// Возвращает список угловых точек [a, …, b]. Если пути нет — L-обход.
export function routeOrthogonal(a: Pt, b: Pt, obstacles: Rect[]): Pt[] {
  return routeCore(a, b, obstacles).path;
}

function routeCore(a: Pt, b: Pt, obstacles: Rect[]): { path: Pt[]; found: boolean } {
  let minx = Math.min(a.x, b.x), maxx = Math.max(a.x, b.x), miny = Math.min(a.y, b.y), maxy = Math.max(a.y, b.y);
  for (const r of obstacles) { minx = Math.min(minx, r.x0); maxx = Math.max(maxx, r.x1); miny = Math.min(miny, r.y0); maxy = Math.max(maxy, r.y1); }
  minx -= MARGIN; miny -= MARGIN; maxx += MARGIN; maxy += MARGIN;
  const cols = Math.ceil((maxx - minx) / G) + 1, rows = Math.ceil((maxy - miny) / G) + 1;
  const gx = (x: number) => Math.min(cols - 1, Math.max(0, Math.round((x - minx) / G)));
  const gy = (y: number) => Math.min(rows - 1, Math.max(0, Math.round((y - miny) / G)));

  const blocked = new Uint8Array(cols * rows);
  for (const r of obstacles) {
    for (let c = gx(r.x0 - PAD); c <= gx(r.x1 + PAD); c++)
      for (let rr = gy(r.y0 - PAD); rr <= gy(r.y1 + PAD); rr++) blocked[rr * cols + c] = 1;
  }
  const sc = gx(a.x), sr = gy(a.y), tc = gx(b.x), tr = gy(b.y);
  blocked[sr * cols + sc] = 0; blocked[tr * cols + tc] = 0;

  // состояние = (cell, dir); dir 0..3 = индекс DIRS, 4 = старт
  const N = cols * rows;
  const g = new Float64Array(N * 5).fill(Infinity);
  const prev = new Int32Array(N * 5).fill(-1);
  const sid = (sr * cols + sc) * 5 + 4;
  g[sid] = 0;
  const heap = new Heap();
  const h = (c: number, r: number) => (Math.abs(c - tc) + Math.abs(r - tr));
  heap.push(sid, h(sc, sr));

  let goal = -1;
  while (heap.size) {
    const cur = heap.pop()!;
    const cell = Math.floor(cur / 5), dir = cur % 5;
    const c = cell % cols, r = (cell - c) / cols;
    if (c === tc && r === tr) { goal = cur; break; }
    for (let d = 0; d < 4; d++) {
      const nc = c + DIRS[d][0], nr = r + DIRS[d][1];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (blocked[nr * cols + nc]) continue;
      const cost = 1 + (dir !== 4 && dir !== d ? TURN : 0);
      const nid = (nr * cols + nc) * 5 + d;
      const ng = g[cur] + cost;
      if (ng < g[nid]) { g[nid] = ng; prev[nid] = cur; heap.push(nid, ng + h(nc, nr)); }
    }
  }

  if (goal < 0) { // нет пути — простой L-обход
    const mx = (a.x + b.x) / 2;
    return { path: [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b], found: false };
  }

  // восстановление пути из сетки
  const cells: Pt[] = [];
  for (let s = goal; s >= 0; s = prev[s]) {
    const cell = Math.floor(s / 5), c = cell % cols, r = (cell - c) / cols;
    cells.push({ x: minx + c * G, y: miny + r * G });
  }
  cells.reverse();
  const g0 = cells[0], gN = cells[cells.length - 1];
  // ортогональные вводные сегменты от точных концов к сетке (ошибка снапа ≤G/2)
  const full: Pt[] = [
    { x: a.x, y: a.y }, { x: g0.x, y: a.y },
    ...cells,
    { x: gN.x, y: b.y }, { x: b.x, y: b.y },
  ];
  return { path: simplify(full), found: true };
}

function simplify(pts: Pt[]): Pt[] {
  if (pts.length <= 2) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!collinear) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
