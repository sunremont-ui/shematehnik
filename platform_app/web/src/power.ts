import { computeNets, type UcpProject } from "./project.ts";

export interface PowerLoad {
  ref: string;
  kind: string;
  value: string;
  rail: string;
  currentA: number;
  source: "default" | "override";
  note: string;
}

export interface PowerRail {
  name: string;
  currentA: number;
  budgetA: number;
  marginA: number;
  overload: boolean;
  loads: PowerLoad[];
}

export interface PowerBudget {
  loads: PowerLoad[];
  rails: PowerRail[];
  totalA: number;
  warnings: string[];
}

const DEFAULT_RAIL_BUDGETS: Record<string, number> = {
  VCC: 0.5,
  VDD: 0.5,
  "3V3": 0.5,
  "5V": 1,
  "12V": 1,
  Unassigned: 0,
};

export function defaultCurrentA(kind: string, value: string): { currentA: number; note: string } {
  const k = kind.toUpperCase();
  const v = value.toLowerCase();
  if (k === "D" && v.includes("led")) return { currentA: 0.01, note: "LED default" };
  if (k === "U" && v.includes("esp32")) return { currentA: 0.12, note: "ESP32 active Wi-Fi estimate" };
  if (k === "U" && v.includes("stm32")) return { currentA: 0.03, note: "STM32 MCU estimate" };
  if (k === "U" && v.includes("atmega")) return { currentA: 0.02, note: "AVR MCU estimate" };
  if (k === "U" && (v.includes("ch340") || v.includes("usb"))) return { currentA: 0.015, note: "USB interface estimate" };
  if (k === "U" && (v.includes("op") || v.includes("lm358"))) return { currentA: 0.002, note: "op-amp quiescent estimate" };
  if (k === "U" && (v.includes("555") || v.includes("ne555"))) return { currentA: 0.005, note: "timer IC estimate" };
  if (k === "U" && (v.includes("ldo") || v.includes("1117") || /78\d\d/.test(v))) return { currentA: 0.005, note: "regulator quiescent estimate" };
  if (k === "Q") return { currentA: 0.001, note: "transistor control estimate" };
  return { currentA: 0, note: "passive/default no load" };
}

export function buildPowerBudget(
  project: UcpProject,
  currentOverrides: Record<string, number> = {},
  railBudgets: Record<string, number> = {},
): PowerBudget {
  const pinNet = buildPinNetMap(project);
  const loads: PowerLoad[] = project.components.map((c) => {
    const rail = inferComponentRail(c.ref, pinNet);
    const def = defaultCurrentA(c.kind, c.value);
    const override = currentOverrides[c.ref];
    const hasOverride = Number.isFinite(override);
    return {
      ref: c.ref,
      kind: c.kind,
      value: c.value,
      rail,
      currentA: Math.max(0, hasOverride ? override : def.currentA),
      source: hasOverride ? "override" : "default",
      note: def.note,
    };
  });

  const byRail = new Map<string, PowerLoad[]>();
  for (const load of loads) (byRail.get(load.rail) ?? byRail.set(load.rail, []).get(load.rail)!).push(load);
  const rails: PowerRail[] = [...byRail.entries()].map(([name, railLoads]) => {
    const currentA = railLoads.reduce((sum, load) => sum + load.currentA, 0);
    const budgetA = railBudgets[name] ?? DEFAULT_RAIL_BUDGETS[name] ?? 0.25;
    return {
      name,
      currentA,
      budgetA,
      marginA: budgetA - currentA,
      overload: budgetA > 0 && currentA > budgetA,
      loads: railLoads,
    };
  }).sort((a, b) => a.name === "Unassigned" ? 1 : b.name === "Unassigned" ? -1 : a.name.localeCompare(b.name));

  const warnings: string[] = [];
  for (const rail of rails) {
    if (rail.name === "Unassigned" && rail.currentA > 0) warnings.push(`${rail.loads.length} load(s) have no power net label`);
    if (rail.overload) warnings.push(`${rail.name} overload: ${formatCurrent(rail.currentA)} / ${formatCurrent(rail.budgetA)}`);
  }
  return {
    loads,
    rails,
    totalA: loads.reduce((sum, load) => sum + load.currentA, 0),
    warnings,
  };
}

export function exportPowerBudgetCsv(budget: PowerBudget): string {
  const lines = ["Rail,Ref,Kind,Value,Current_mA,Source,Note"];
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  for (const load of budget.loads) {
    lines.push([
      esc(load.rail), load.ref, load.kind, esc(load.value), (load.currentA * 1000).toFixed(3), load.source, esc(load.note),
    ].join(","));
  }
  lines.push("");
  lines.push("Rail,Current_mA,Budget_mA,Margin_mA,Status");
  for (const rail of budget.rails) {
    lines.push([
      esc(rail.name), (rail.currentA * 1000).toFixed(3), (rail.budgetA * 1000).toFixed(3),
      (rail.marginA * 1000).toFixed(3), rail.overload ? "OVERLOAD" : "OK",
    ].join(","));
  }
  return lines.join("\n");
}

export function formatCurrent(currentA: number): string {
  const abs = Math.abs(currentA);
  if (abs >= 1) return `${trim(currentA)} A`;
  if (abs >= 1e-3) return `${trim(currentA * 1e3)} mA`;
  return `${trim(currentA * 1e6)} uA`;
}

function buildPinNetMap(project: UcpProject): Map<string, string> {
  const out = new Map<string, string>();
  for (const net of computeNets(project)) {
    const normalized = normalizeRailName(net.name) ?? net.name;
    for (const pin of net.pins) out.set(pin, normalized);
  }
  for (const label of project.labels) {
    const normalized = normalizeRailName(label.net) ?? label.net;
    out.set(`${label.ref}.${label.pin}`, normalized);
  }
  return out;
}

function inferComponentRail(ref: string, pinNet: Map<string, string>): string {
  const nets = [...pinNet.entries()].filter(([pin]) => pin.startsWith(`${ref}.`)).map(([, net]) => net);
  const rail = nets.find((net) => !isGround(net) && isPowerNet(net));
  return rail ?? "Unassigned";
}

function normalizeRailName(net: string): string | null {
  const n = net.trim().toUpperCase().replace(/\s+/g, "");
  if (!n) return null;
  if (/^(GND|VSS|0V|DGND|AGND)$/.test(n)) return "GND";
  if (/^(\+)?3(\.|_)3V?$/.test(n) || n === "3V3") return "3V3";
  if (/^(\+)?5V?$/.test(n)) return "5V";
  if (/^(\+)?12V?$/.test(n)) return "12V";
  if (/^(VCC|VDD|VBAT)$/.test(n)) return n;
  return n;
}

function isGround(net: string): boolean {
  return /^(GND|VSS|0V|DGND|AGND)$/i.test(net);
}

function isPowerNet(net: string): boolean {
  return /^(VCC|VDD|VBAT|3V3|5V|12V|\+?\d+(\.\d+)?V)$/i.test(net);
}

function trim(n: number): string {
  return Number(n.toPrecision(4)).toString();
}
