import { describe, expect, it } from "vitest";
import { buildPowerBudget, defaultCurrentA, exportPowerBudgetCsv } from "./power.ts";
import type { UcpProject } from "./project.ts";

const project: UcpProject = {
  version: 1,
  name: "Power test",
  components: [
    { id: "u1", ref: "U1", kind: "U", value: "STM32F401", x: 0, y: 0 },
    { id: "d1", ref: "D1", kind: "D", value: "LED", x: 0, y: 0 },
    { id: "u2", ref: "U2", kind: "U", value: "CH340C", x: 0, y: 0 },
  ],
  wires: [],
  labels: [
    { ref: "U1", pin: "1", net: "3V3" },
    { ref: "U1", pin: "6", net: "GND" },
    { ref: "D1", pin: "1", net: "3V3" },
    { ref: "D1", pin: "2", net: "GND" },
    { ref: "U2", pin: "1", net: "5V" },
    { ref: "U2", pin: "6", net: "GND" },
  ],
  tracks: [],
};

describe("power budget", () => {
  it("assigns default currents from component kind/value", () => {
    expect(defaultCurrentA("D", "LED").currentA).toBeCloseTo(0.01);
    expect(defaultCurrentA("U", "ESP32-WROOM").currentA).toBeCloseTo(0.12);
    expect(defaultCurrentA("R", "10k").currentA).toBe(0);
  });

  it("groups loads by power rails and sums current", () => {
    const budget = buildPowerBudget(project);
    const rail3v3 = budget.rails.find((r) => r.name === "3V3");
    const rail5v = budget.rails.find((r) => r.name === "5V");
    expect(rail3v3?.currentA).toBeCloseTo(0.04);
    expect(rail5v?.currentA).toBeCloseTo(0.015);
    expect(budget.totalA).toBeCloseTo(0.055);
    expect(budget.warnings).toEqual([]);
  });

  it("reports overload against editable rail budget", () => {
    const budget = buildPowerBudget(project, { U1: 0.08 }, { "3V3": 0.05, "5V": 0.1 });
    expect(budget.rails.find((r) => r.name === "3V3")?.overload).toBe(true);
    expect(budget.warnings[0]).toContain("3V3 overload");
  });

  it("warns about unassigned active loads", () => {
    const p = { ...project, labels: project.labels.filter((l) => l.ref !== "U2") };
    const budget = buildPowerBudget(p);
    expect(budget.rails.find((r) => r.name === "Unassigned")?.currentA).toBeCloseTo(0.015);
    expect(budget.warnings.some((w) => w.includes("no power net label"))).toBe(true);
  });

  it("exports load and rail summary CSV", () => {
    const csv = exportPowerBudgetCsv(buildPowerBudget(project));
    expect(csv).toContain("Rail,Ref,Kind,Value,Current_mA");
    expect(csv).toContain("3V3,U1,U,STM32F401,30.000");
    expect(csv).toContain("Rail,Current_mA,Budget_mA");
  });
});
