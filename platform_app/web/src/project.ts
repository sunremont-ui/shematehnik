// ============================================================
// Общая модель проекта UCP — единый источник правды для модулей.
// Формат .ucp (JSON) — упрощённый порт core/project.cpp десктопа.
// Schematic редактирует, Netlist/PCB/SPICE читают (поток данных).
// ============================================================

export interface SchComponent {
  id: string;
  ref: string;     // R1, C1, U1…
  kind: string;    // R, C, L, D, Q, U
  value: string;   // 10k, 100n…
  x: number;
  y: number;
  rot?: number;        // поворот символа, градусы (0/90/180/270)
  footprint?: string;  // посадочное место (из библиотеки)
}

// Провод соединяет два вывода: { refdes, pin "1"|"2" }.
export interface PinRef { ref: string; pin: string; }
export interface SchWire { from: PinRef; to: PinRef; }
// Net-метка / power-символ: привязывает имя цепи к выводу (связь без провода).
export interface NetLabel { ref: string; pin: string; net: string; }

export interface UcpProject {
  version: 1;
  name: string;
  components: SchComponent[];
  wires: SchWire[];
  labels: NetLabel[];
}

export function emptyProject(name = "Untitled Project"): UcpProject {
  return {
    version: 1,
    name,
    components: [
      { id: "c1", ref: "R1", kind: "R", value: "10k", x: 160, y: 140 },
      { id: "c2", ref: "C1", kind: "C", value: "100n", x: 320, y: 140 },
      { id: "c3", ref: "U1", kind: "U", value: "STM32F401", x: 240, y: 280 },
    ],
    wires: [
      { from: { ref: "R1", pin: "2" }, to: { ref: "C1", pin: "1" } },
    ],
    labels: [],
  };
}

export function serialize(p: UcpProject): string {
  return JSON.stringify(p, null, 2);
}

export function deserialize(json: string): UcpProject {
  const raw = JSON.parse(json) as Partial<UcpProject>;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.components))
    throw new Error("Invalid .ucp file");
  const components = raw.components.map((c, i) => {
    const rot = ((Number(c.rot) || 0) % 360 + 360) % 360;
    return {
      id: c.id ?? `c${i}`,
      ref: c.ref ?? `?${i}`,
      kind: c.kind ?? "U",
      value: c.value ?? "",
      x: Number(c.x) || 0,
      y: Number(c.y) || 0,
      ...(rot ? { rot } : {}),     // опускаем при 0 (стабильный round-trip)
      ...(c.footprint ? { footprint: String(c.footprint) } : {}),
    };
  });
  const refs = new Set(components.map((c) => c.ref));
  const wires = (Array.isArray(raw.wires) ? raw.wires : [])
    .filter((w): w is SchWire => !!w && !!w.from && !!w.to && refs.has(w.from.ref) && refs.has(w.to.ref))
    .map((w) => ({ from: { ref: w.from.ref, pin: String(w.from.pin) }, to: { ref: w.to.ref, pin: String(w.to.pin) } }));
  const labels = (Array.isArray(raw.labels) ? raw.labels : [])
    .filter((l): l is NetLabel => !!l && refs.has(l.ref) && !!l.net)
    .map((l) => ({ ref: l.ref, pin: String(l.pin), net: String(l.net) }));
  return {
    version: 1,
    name: typeof raw.name === "string" ? raw.name : "Untitled Project",
    components,
    wires,
    labels,
  };
}

// Список выводов компонента по типу. U — 6 выводов (3+3),
// Q — 3 (1=База/Затвор, 2=Коллектор/Сток, 3=Эмиттер/Исток), остальные — 2.
export function pinsOf(kind: string): string[] {
  if (kind === "U") return ["1", "2", "3", "4", "5", "6"];
  if (kind === "Q") return ["1", "2", "3"];
  return ["1", "2"];
}

// Смещение вывода относительно центра компонента (общая геометрия для
// Schematic и PCB). 2-pin: лево/право. Q: 1 слева, 2/3 справа сверху/снизу.
// U: 3 слева (1-3), 3 справа (4-6).
// rot — поворот символа (градусы), вращает смещение вокруг центра.
export function pinOffset(kind: string, pin: string, rot = 0): { dx: number; dy: number } {
  const pins = pinsOf(kind);
  const base = pins.length === 2
    ? { dx: pin === "1" ? -24 : 24, dy: 0 }
    : pins.length === 3
      ? (pin === "1" ? { dx: -24, dy: 0 } : { dx: 24, dy: pin === "2" ? -14 : 14 })
      : { dx: (Math.max(0, pins.indexOf(pin)) < 3 ? -1 : 1) * 28, dy: (Math.max(0, pins.indexOf(pin)) % 3 - 1) * 18 };
  if (!rot) return base;
  const r = rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return { dx: base.dx * c - base.dy * s, dy: base.dx * s + base.dy * c };
}

// ---------- Design Rule Check (по реальной модели) ----------
export interface DrcResult {
  floating: string[];   // выводы без подключения
  nets: number;         // число цепей (групп >1 вывода)
  unrouted: number;     // неразведённые цепи (нет меди → все)
  errors: number;
}

export function runDrc(p: UcpProject): DrcResult {
  const pins: string[] = [];
  for (const c of p.components) for (const pin of pinsOf(c.kind)) pins.push(`${c.ref}.${pin}`);
  const valid = new Set(pins);
  const used = new Set<string>();
  for (const w of p.wires) {
    const a = `${w.from.ref}.${w.from.pin}`, b = `${w.to.ref}.${w.to.pin}`;
    if (valid.has(a) && valid.has(b)) { used.add(a); used.add(b); }
  }
  for (const l of p.labels) used.add(`${l.ref}.${l.pin}`); // помеченные выводы подключены
  const nets = computeNets(p).length;
  const floating = pins.filter((s) => !used.has(s));
  return { floating, nets, unrouted: nets, errors: floating.length };
}

// ---------- Цепи и экспорт нетлиста ----------
export interface Net { name: string; pins: string[]; }

export function computeNets(p: UcpProject): Net[] {
  const pins: string[] = [];
  for (const c of p.components) for (const pin of pinsOf(c.kind)) pins.push(`${c.ref}.${pin}`);
  const idx = new Map(pins.map((s, i) => [s, i]));
  const parent = pins.map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const w of p.wires) {
    const a = idx.get(`${w.from.ref}.${w.from.pin}`), b = idx.get(`${w.to.ref}.${w.to.pin}`);
    if (a != null && b != null) parent[find(a)] = find(b);
  }
  // объединяем выводы с одинаковой net-меткой (связь без провода)
  const labelOf = new Map<string, string>();
  const byNet = new Map<string, number[]>();
  for (const l of p.labels) {
    const i = idx.get(`${l.ref}.${l.pin}`); if (i == null) continue;
    labelOf.set(`${l.ref}.${l.pin}`, l.net);
    (byNet.get(l.net) ?? byNet.set(l.net, []).get(l.net)!).push(i);
  }
  for (const idxs of byNet.values()) for (let j = 1; j < idxs.length; j++) parent[find(idxs[0])] = find(idxs[j]);

  const groups = new Map<number, string[]>();
  pins.forEach((s, i) => { const r = find(i); (groups.get(r) ?? groups.set(r, []).get(r)!).push(s); });
  let n = 0;
  return [...groups.values()].filter((g) => g.length > 1).map((g) => {
    const named = g.map((s) => labelOf.get(s)).find(Boolean);   // имя из метки, если есть
    return { name: named ?? `N$${++n}`, pins: g };
  });
}

// Нетлист в простом скобочном формате (как у KiCad/Tango, читаемо).
export function exportNetlist(p: UcpProject): string {
  const lines: string[] = [];
  lines.push(`(export (version "UCP-1")`);
  lines.push(`  (design (source "${p.name}.ucp"))`);
  lines.push(`  (components`);
  for (const c of p.components)
    lines.push(`    (comp (ref "${c.ref}") (value "${c.value}") (kind "${c.kind}"))`);
  lines.push(`  )`);
  lines.push(`  (nets`);
  for (const net of computeNets(p)) {
    lines.push(`    (net (name "${net.name}")`);
    for (const pin of net.pins) {
      const [ref, num] = pin.split(".");
      lines.push(`      (node (ref "${ref}") (pin "${num}"))`);
    }
    lines.push(`    )`);
  }
  lines.push(`  )`);
  lines.push(`)`);
  return lines.join("\n");
}

// ---------- BOM (bill of materials) → CSV ----------
// Группирует компоненты по (kind, value); сортировка по типу/значению,
// рефдесы — натуральной сортировкой. Поля экранируются по RFC 4180.
export function exportBom(p: UcpProject): string {
  const groups = new Map<string, { kind: string; value: string; footprint: string; refs: string[] }>();
  for (const c of p.components) {
    const key = `${c.kind} ${c.value}`;
    const g = groups.get(key) ?? groups.set(key, { kind: c.kind, value: c.value, footprint: c.footprint ?? "", refs: [] }).get(key)!;
    g.refs.push(c.ref);
  }
  const nat = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const rows = [...groups.values()].sort((a, b) => a.kind === b.kind ? nat(a.value, b.value) : nat(a.kind, b.kind));
  const lines = ["Designators,Value,Kind,Footprint,Quantity"];
  for (const g of rows) {
    g.refs.sort(nat);
    lines.push([esc(g.refs.join(", ")), esc(g.value), esc(g.kind), esc(g.footprint), String(g.refs.length)].join(","));
  }
  return lines.join("\n");
}

// ---------- Импорт нетлиста KiCad/UCP (S-expression) ----------
type Sexpr = string | Sexpr[];

function parseSexpr(s: string): Sexpr {
  let i = 0;
  const skip = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function parse(): Sexpr {
    skip();
    if (s[i] === "(") {
      i++; const list: Sexpr[] = [];
      while (i < s.length && s[i] !== ")") { list.push(parse()); skip(); }
      i++; return list;
    }
    if (s[i] === '"') {
      i++; let str = "";
      while (i < s.length && s[i] !== '"') { if (s[i] === "\\") i++; str += s[i++]; }
      i++; return str;
    }
    let a = ""; while (i < s.length && !/[\s()]/.test(s[i])) a += s[i++];
    return a;
  }
  skip(); return parse();
}

const sFind = (n: Sexpr | undefined, tag: string): Sexpr[] | undefined =>
  Array.isArray(n) ? (n.find((c) => Array.isArray(c) && c[0] === tag) as Sexpr[] | undefined) : undefined;
const sAll = (n: Sexpr | undefined, tag: string): Sexpr[][] =>
  Array.isArray(n) ? (n.filter((c) => Array.isArray(c) && c[0] === tag) as Sexpr[][]) : [];
const sVal = (n: Sexpr | undefined, tag: string): string => {
  const c = n ? sFind(n, tag) : undefined;
  return c && typeof c[1] === "string" ? c[1] : "";
};

const KINDS = new Set(["R", "C", "L", "D", "Q", "U"]);
const kindOfRef = (ref: string): string => (KINDS.has(ref[0]?.toUpperCase()) ? ref[0].toUpperCase() : "U");

// Парсит netlist (формат exportNetlist / KiCad eeschema) в UcpProject.
// Провода строятся как звезда внутри каждой цепи; пины вне модели отбрасываются.
export function importNetlist(text: string, name = "Imported"): UcpProject {
  const root = parseSexpr(text);
  const compsNode = sFind(root, "components");
  const components: SchComponent[] = sAll(compsNode, "comp").map((c, i) => {
    const ref = sVal(c, "ref") || `?${i}`;
    const kind = kindOfRef(ref);
    return { id: `i${i}`, ref, kind, value: sVal(c, "value"), x: 120 + (i % 4) * 110, y: 100 + Math.floor(i / 4) * 100 };
  });
  if (components.length === 0) throw new Error("No components in netlist");

  const validPin = new Map(components.map((c) => [c.ref, new Set(pinsOf(c.kind))]));
  const wires: SchWire[] = [];
  for (const net of sAll(sFind(root, "nets"), "net")) {
    const nodes = sAll(net, "node")
      .map((nd) => ({ ref: sVal(nd, "ref"), pin: sVal(nd, "pin") }))
      .filter((p) => validPin.get(p.ref)?.has(p.pin));
    for (let j = 1; j < nodes.length; j++) wires.push({ from: nodes[0], to: nodes[j] }); // звезда
  }
  return { version: 1, name, components, wires, labels: [] };
}

// Рекурсивно собрать пины (number + относительная точка подключения `at`).
function collectPins(sym: Sexpr): { num: string; x: number; y: number }[] {
  const out: { num: string; x: number; y: number }[] = [];
  if (!Array.isArray(sym)) return out;
  for (const child of sym) {
    if (!Array.isArray(child)) continue;
    if (child[0] === "pin") {
      const at = sFind(child, "at"), num = sFind(child, "number");
      if (at) out.push({ num: num && typeof num[1] === "string" ? num[1] : String(out.length + 1), x: Number(at[1]) || 0, y: Number(at[2]) || 0 });
    } else if (child[0] === "symbol") {
      out.push(...collectPins(child)); // вложенные под-символы
    }
  }
  return out;
}

// Импорт схемы KiCad (.kicad_sch): компоненты с раскладкой + цепи по прямой
// проводной связности (геометрия пинов из lib_symbols + трансформация инстанса).
// Ограничение: net-метки / power-символы / иерархия НЕ разрешаются — только
// пины, физически соединённые проводами (wire). Поворот/зеркало — best-effort.
export function importKicadSch(text: string, name = "KiCad import"): UcpProject {
  const root = parseSexpr(text);

  // 1) пины библиотечных символов: lib_id → [{num, x, y}] (Y-up, мм)
  const libPins = new Map<string, { num: string; x: number; y: number }[]>();
  const lib = sFind(root, "lib_symbols");
  if (lib) for (const s of sAll(lib, "symbol")) if (typeof s[1] === "string") libPins.set(s[1], collectPins(s));

  // 2) инстансы → компоненты + абсолютные точки подключения пинов
  const syms = sAll(root, "symbol").filter((s) => sFind(s, "lib_id"));
  interface Inst { ref: string; value: string; x: number; y: number; pins: { num: string; x: number; y: number }[]; }
  const insts: Inst[] = [];
  for (const s of syms) {
    const props = sAll(s, "property");
    const prop = (n: string) => { const p = props.find((p) => p[1] === n); return p && typeof p[2] === "string" ? p[2] : ""; };
    const ref = prop("Reference");
    if (!ref || ref.startsWith("#")) continue;          // #PWR/#FLG — не детали
    const at = sFind(s, "at");
    const ix = at ? Number(at[1]) || 0 : 0, iy = at ? Number(at[2]) || 0 : 0;
    const rot = (at && Number(at[3])) || 0;
    const mir = sFind(s, "mirror");
    const mx = mir && mir[1] === "y" ? -1 : 1, my = mir && mir[1] === "x" ? -1 : 1;
    const c = Math.cos(rot * Math.PI / 180), sn = Math.sin(rot * Math.PI / 180);
    const lp = libPins.get(sVal(s, "lib_id")) ?? [];
    const pins = lp.map((p) => {
      const lx = p.x * mx, ly = p.y * my;
      const rx = lx * c - ly * sn, ry = lx * sn + ly * c;   // поворот в lib-координатах (Y-up)
      return { num: p.num, x: ix + rx, y: iy - ry };        // в схемные (Y-down)
    });
    insts.push({ ref, value: prop("Value"), x: ix, y: iy, pins });
  }
  if (insts.length === 0) throw new Error("No symbols in .kicad_sch");

  // 3) union-find по совпадающим точкам (пины + концы проводов)
  const key = (x: number, y: number) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const parent = new Map<string, string>();
  const find = (k: string): string => { let r = k; while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!; parent.set(k, r); return r; };
  const ensure = (k: string) => { if (!parent.has(k)) parent.set(k, k); };
  const uni = (a: string, b: string) => { ensure(a); ensure(b); parent.set(find(a), find(b)); };
  for (const w of sAll(root, "wire")) {
    const pts = sFind(w, "pts"); if (!pts) continue;
    const xy = sAll(pts, "xy");
    for (let i = 0; i + 1 < xy.length; i++) uni(key(Number(xy[i][1]), Number(xy[i][2])), key(Number(xy[i + 1][1]), Number(xy[i + 1][2])));
  }

  // 4) цепи = группы пинов по корню union-find
  const netOf = new Map<string, string[]>();   // root → ["R1.1", …]
  for (const inst of insts) for (const p of inst.pins) {
    const k = key(p.x, p.y); ensure(k);
    const r = find(k);
    (netOf.get(r) ?? netOf.set(r, []).get(r)!).push(`${inst.ref}.${p.num}`);
  }
  const wires: SchWire[] = [];
  for (const nodes of netOf.values()) {
    if (nodes.length < 2) continue;
    for (let i = 1; i < nodes.length; i++) {
      const [r0, p0] = nodes[0].split("."), [r1, p1] = nodes[i].split(".");
      wires.push({ from: { ref: r0, pin: p0 }, to: { ref: r1, pin: p1 } });
    }
  }

  // 5) компоненты с раскладкой (нормализация координат в область канвы)
  const xs = insts.map((c) => c.x), ys = insts.map((c) => c.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const nx = (v: number) => maxx > minx ? 120 + ((v - minx) / (maxx - minx)) * 240 : 240;
  const ny = (v: number) => maxy > miny ? 100 + ((v - miny) / (maxy - miny)) * 200 : 200;
  const refs = new Set(insts.map((c) => c.ref));
  const components: SchComponent[] = insts.map((c, i) => ({
    id: `k${i}`, ref: c.ref, kind: kindOfRef(c.ref), value: c.value, x: Math.round(nx(c.x)), y: Math.round(ny(c.y)),
  }));
  // отбрасываем цепи на выводы вне модели (pinsOf) — наша модель фиксирована
  const valid = new Map(components.map((c) => [c.ref, new Set(pinsOf(c.kind))]));
  const keptWires = wires.filter((w) => refs.has(w.from.ref) && refs.has(w.to.ref) && valid.get(w.from.ref)?.has(w.from.pin) && valid.get(w.to.ref)?.has(w.to.pin));
  return { version: 1, name, components, wires: keptWires, labels: [] };
}

// Следующий refdes для типа (R1→R2…), исходя из уже занятых.
export function nextRef(components: SchComponent[], kind: string): string {
  let max = 0;
  for (const c of components) {
    if (c.kind === kind) {
      const n = parseInt(c.ref.slice(kind.length), 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return `${kind}${max + 1}`;
}
