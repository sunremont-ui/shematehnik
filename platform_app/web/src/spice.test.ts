import { describe, it, expect } from "vitest";
import { parseValue, buildNodes, buildElements, transient, acSweep } from "./spice.ts";
import type { UcpProject } from "./project.ts";

// RC low-pass: вход → R1 → out → C1 → gnd.  R=1k, C=1µF → τ=1мс, fc≈159 Гц.
function rcProject(): UcpProject {
  return {
    version: 1, name: "RC",
    components: [
      { id: "r", ref: "R1", kind: "R", value: "1k", x: 0, y: 0 },
      { id: "c", ref: "C1", kind: "C", value: "1u", x: 0, y: 0 },
    ],
    wires: [{ from: { ref: "R1", pin: "2" }, to: { ref: "C1", pin: "1" } }],
    labels: [],
  };
}

describe("parseValue", () => {
  it("инженерные суффиксы", () => {
    expect(parseValue("10k")).toBe(10000);
    expect(parseValue("100n")).toBeCloseTo(1e-7, 18);
    expect(parseValue("4.7u")).toBeCloseTo(4.7e-6, 18);
    expect(parseValue("2.2M")).toBe(2.2e6);
    expect(parseValue("1meg")).toBe(1e6);
    expect(parseValue("470")).toBe(470);
    expect(parseValue("1kΩ")).toBe(1000);
    expect(parseValue("")).toBe(0);
  });
});

describe("buildNodes / buildElements", () => {
  it("узлы RC: input, out, gnd — три разных", () => {
    const p = rcProject();
    const nodes = buildNodes(p);
    const inN = nodes.nodeOf.get("R1.1")!, out = nodes.nodeOf.get("R1.2")!, gnd = nodes.nodeOf.get("C1.2")!;
    expect(out).toBe(nodes.nodeOf.get("C1.1")); // провод объединил
    expect(new Set([inN, out, gnd]).size).toBe(3);
    const el = buildElements(p, nodes);
    expect(el.map((e) => e.kind).sort()).toEqual(["C", "R"]);
    expect(el.find((e) => e.ref === "R1")!.value).toBe(1000);
    expect(el.find((e) => e.ref === "C1")!.value).toBeCloseTo(1e-6, 18);
  });
});

describe("transient RC step", () => {
  it("vout(τ) ≈ 0.632·Vin", () => {
    const p = rcProject();
    const nodes = buildNodes(p);
    const elems = buildElements(p, nodes);
    const input = nodes.nodeOf.get("R1.1")!, ground = nodes.nodeOf.get("C1.2")!, out = nodes.nodeOf.get("R1.2")!;
    const tau = 1e-3;
    const res = transient({
      numNodes: nodes.groups.length, ground, input,
      stimulus: () => 1, elems, tEnd: 5 * tau, steps: 2000,
    });
    // индекс ближайший к t=τ
    const it = res.t.findIndex((t) => t >= tau);
    expect(res.v[out][it]).toBeCloseTo(0.632, 1);
    // установившееся значение → 1 В
    expect(res.v[out][res.t.length - 1]).toBeCloseTo(1, 1);
  });
});

describe("AC RC low-pass", () => {
  it("на fc≈159 Гц затухание ≈ -3 дБ", () => {
    const p = rcProject();
    const nodes = buildNodes(p);
    const elems = buildElements(p, nodes);
    const input = nodes.nodeOf.get("R1.1")!, ground = nodes.nodeOf.get("C1.2")!, probe = nodes.nodeOf.get("R1.2")!;
    const fc = 1 / (2 * Math.PI * 1000 * 1e-6);
    const res = acSweep({ numNodes: nodes.groups.length, ground, input, probe, elems, fStart: fc, fStop: fc, points: 1 });
    expect(res.magDb[0]).toBeCloseTo(-3.01, 1);
    expect(res.phaseDeg[0]).toBeCloseTo(-45, 0);
  });
  it("низкая частота → ≈0 дБ, высокая → сильное затухание", () => {
    const p = rcProject();
    const nodes = buildNodes(p);
    const elems = buildElements(p, nodes);
    const input = nodes.nodeOf.get("R1.1")!, ground = nodes.nodeOf.get("C1.2")!, probe = nodes.nodeOf.get("R1.2")!;
    const res = acSweep({ numNodes: nodes.groups.length, ground, input, probe, elems, fStart: 1, fStop: 1e5, points: 60 });
    expect(res.magDb[0]).toBeCloseTo(0, 1);
    expect(res.magDb[res.magDb.length - 1]).toBeLessThan(-40);
  });
});
