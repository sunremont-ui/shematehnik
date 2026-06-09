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
}

// Провод соединяет два вывода: { refdes, pin "1"|"2" }.
export interface PinRef { ref: string; pin: string; }
export interface SchWire { from: PinRef; to: PinRef; }

export interface UcpProject {
  version: 1;
  name: string;
  components: SchComponent[];
  wires: SchWire[];
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
  };
}

export function serialize(p: UcpProject): string {
  return JSON.stringify(p, null, 2);
}

export function deserialize(json: string): UcpProject {
  const raw = JSON.parse(json) as Partial<UcpProject>;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.components))
    throw new Error("Invalid .ucp file");
  const components = raw.components.map((c, i) => ({
    id: c.id ?? `c${i}`,
    ref: c.ref ?? `?${i}`,
    kind: c.kind ?? "U",
    value: c.value ?? "",
    x: Number(c.x) || 0,
    y: Number(c.y) || 0,
  }));
  const refs = new Set(components.map((c) => c.ref));
  const wires = (Array.isArray(raw.wires) ? raw.wires : [])
    .filter((w): w is SchWire => !!w && !!w.from && !!w.to && refs.has(w.from.ref) && refs.has(w.to.ref))
    .map((w) => ({ from: { ref: w.from.ref, pin: String(w.from.pin) }, to: { ref: w.to.ref, pin: String(w.to.pin) } }));
  return {
    version: 1,
    name: typeof raw.name === "string" ? raw.name : "Untitled Project",
    components,
    wires,
  };
}

// Список выводов компонента по типу. U — 6 выводов (3+3), остальные — 2.
export function pinsOf(kind: string): string[] {
  if (kind === "U") return ["1", "2", "3", "4", "5", "6"];
  return ["1", "2"];
}

// Смещение вывода относительно центра компонента (общая геометрия для
// Schematic и PCB). 2-pin: лево/право. U: 3 слева (1-3), 3 справа (4-6).
export function pinOffset(kind: string, pin: string): { dx: number; dy: number } {
  const pins = pinsOf(kind);
  if (pins.length === 2) return { dx: pin === "1" ? -24 : 24, dy: 0 };
  const i = Math.max(0, pins.indexOf(pin));
  const side = i < 3 ? -1 : 1;
  const row = i % 3;
  return { dx: side * 28, dy: (row - 1) * 18 };
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
  const idx = new Map(pins.map((s, i) => [s, i]));

  // union-find по проводам
  const parent = pins.map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const used = new Set<string>();
  for (const w of p.wires) {
    const a = idx.get(`${w.from.ref}.${w.from.pin}`), b = idx.get(`${w.to.ref}.${w.to.pin}`);
    if (a == null || b == null) continue;
    used.add(`${w.from.ref}.${w.from.pin}`); used.add(`${w.to.ref}.${w.to.pin}`);
    parent[find(a)] = find(b);
  }
  const groups = new Map<number, number>();
  pins.forEach((_, i) => { const r = find(i); groups.set(r, (groups.get(r) ?? 0) + 1); });
  const nets = [...groups.values()].filter((n) => n > 1).length;
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
  const groups = new Map<number, string[]>();
  pins.forEach((s, i) => { const r = find(i); (groups.get(r) ?? groups.set(r, []).get(r)!).push(s); });
  let n = 0;
  return [...groups.values()].filter((g) => g.length > 1).map((g) => ({ name: `N$${++n}`, pins: g }));
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
