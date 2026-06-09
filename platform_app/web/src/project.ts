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

export interface UcpProject {
  version: 1;
  name: string;
  components: SchComponent[];
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
  };
}

export function serialize(p: UcpProject): string {
  return JSON.stringify(p, null, 2);
}

export function deserialize(json: string): UcpProject {
  const raw = JSON.parse(json) as Partial<UcpProject>;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.components))
    throw new Error("Invalid .ucp file");
  return {
    version: 1,
    name: typeof raw.name === "string" ? raw.name : "Untitled Project",
    components: raw.components.map((c, i) => ({
      id: c.id ?? `c${i}`,
      ref: c.ref ?? `?${i}`,
      kind: c.kind ?? "U",
      value: c.value ?? "",
      x: Number(c.x) || 0,
      y: Number(c.y) || 0,
    })),
  };
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
