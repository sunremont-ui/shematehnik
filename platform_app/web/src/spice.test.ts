import { describe, it, expect } from "vitest";
import { parseValue, buildNodes, buildElements, transient, acSweep, dcSolve, dcSweep, type Elem } from "./spice.ts";
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

// ============================================================
// Нелинейные приборы (фаза 11): диод/БЮТ/MOSFET через Ньютон-Рафсон.
// ============================================================
describe("нелинейный DC (Ньютон-Рафсон)", () => {
  // Узлы: 0=вход, 1=середина, 2=земля.
  const diodeCircuit = (): Elem[] => [
    { ref: "R1", kind: "R", a: 0, b: 1, value: 1000 },
    { ref: "D1", kind: "D", a: 1, b: 2, value: 0, dm: { is: 1e-14, n: 1 } },
  ];

  it("диод: 5В → R1k → D → gnd, Vd ≈ 0.65–0.7", () => {
    const v = dcSolve({ numNodes: 3, ground: 2, input: 0, vsrc: 5, elems: diodeCircuit() });
    expect(v[1]).toBeGreaterThan(0.55);
    expect(v[1]).toBeLessThan(0.78);
    // KCL: ток через R равен току диода
    const ir = (5 - v[1]) / 1000;
    const id = 1e-14 * (Math.exp(v[1] / 0.02585) - 1);
    expect(id).toBeCloseTo(ir, 4);
  });

  it("обратное смещение: ток ≈ 0, всё падение на диоде", () => {
    const v = dcSolve({ numNodes: 3, ground: 2, input: 0, vsrc: -5, elems: diodeCircuit() });
    expect(v[1]).toBeCloseTo(-5, 2);
  });

  it("NPN с общим эмиттером: активная область, Ic/Ib ≈ βF", () => {
    // 0=VCC 5В, 1=коллектор, 2=база, 3=земля. Rc=1k, Rb=200k.
    const elems: Elem[] = [
      { ref: "Rc", kind: "R", a: 0, b: 1, value: 1000 },
      { ref: "Rb", kind: "R", a: 0, b: 2, value: 200000 },
      { ref: "Q1", kind: "Q", a: 1, b: 3, c: 2, value: 0, pol: 1 },
    ];
    const v = dcSolve({ numNodes: 4, ground: 3, input: 0, vsrc: 5, elems });
    expect(v[2]).toBeGreaterThan(0.55);    // Vbe
    expect(v[2]).toBeLessThan(0.8);
    const ic = (5 - v[1]) / 1000, ib = (5 - v[2]) / 200000;
    expect(ic / ib).toBeGreaterThan(85);   // βF = 100
    expect(ic / ib).toBeLessThan(110);
    expect(v[1]).toBeGreaterThan(1.5);     // не в насыщении
    expect(v[1]).toBeLessThan(4);
  });

  it("PNP: зеркальная полярность", () => {
    // 0=+5В (эмиттер), 1=база, 2=коллектор, 3=земля. Rb=200k, Rc=1k.
    const elems: Elem[] = [
      { ref: "Rb", kind: "R", a: 1, b: 3, value: 200000 },
      { ref: "Rc", kind: "R", a: 2, b: 3, value: 1000 },
      { ref: "Q1", kind: "Q", a: 2, b: 0, c: 1, value: 0, pol: -1 },
    ];
    const v = dcSolve({ numNodes: 4, ground: 3, input: 0, vsrc: 5, elems });
    expect(5 - v[1]).toBeGreaterThan(0.55);   // Veb
    expect(5 - v[1]).toBeLessThan(0.8);
    expect(v[2]).toBeGreaterThan(1.4);        // Ic·Rc ≈ β·Ib·1k ≈ 2.2 В
    expect(v[2]).toBeLessThan(3.2);
  });

  it("NMOS в насыщении: Id = K/2·(Vgs−Vth)²", () => {
    // 0=VDD 5В, 1=сток, 2=затвор (3В через aux), 3=земля. Rd=50.
    const elems: Elem[] = [
      { ref: "Rd", kind: "R", a: 0, b: 1, value: 50 },
      { ref: "M1", kind: "M", a: 1, b: 3, c: 2, value: 0, pol: 1 },
    ];
    const v = dcSolve({ numNodes: 4, ground: 3, input: 0, vsrc: 5, aux: [{ p: 2, v: 3 }], elems });
    // Vov=1, Id=0.05А → Vd = 5 − 0.05·50 = 2.5
    expect(v[1]).toBeCloseTo(2.5, 1);
  });

  it("dcSweep: ВАХ диода монотонна и насыщается у ~0.8 В", () => {
    const { x, v } = dcSweep({ numNodes: 3, ground: 2, input: 0, probe: 1, elems: diodeCircuit(), from: 0, to: 5, steps: 50 });
    expect(x.length).toBe(51);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThanOrEqual(v[i - 1] - 1e-9);
    expect(v[v.length - 1]).toBeLessThan(0.85);
  });

  it("транзиент: однополупериодный выпрямитель давит отрицательную полуволну", () => {
    // 0=вход (синус ±5В), 1=выход, 2=земля. D вперёд, R нагрузка 1k.
    const elems: Elem[] = [
      { ref: "D1", kind: "D", a: 0, b: 1, value: 0, dm: { is: 1e-14, n: 1 } },
      { ref: "RL", kind: "R", a: 1, b: 2, value: 1000 },
    ];
    const res = transient({
      numNodes: 3, ground: 2, input: 0,
      stimulus: (t) => 5 * Math.sin(2 * Math.PI * 100 * t),
      elems, tEnd: 0.02, steps: 800,
    });
    const out = res.v[1];
    expect(Math.min(...out)).toBeGreaterThan(-0.2);
    expect(Math.max(...out)).toBeGreaterThan(3.7);
    expect(Math.max(...out)).toBeLessThan(4.8);
  });

  it("AC: диод в рабочей точке = малосигнальное сопротивление rd≈VT/Id", () => {
    const elems = diodeCircuit();
    const bias = dcSolve({ numNodes: 3, ground: 2, input: 0, vsrc: 5, elems });
    const res = acSweep({ numNodes: 3, ground: 2, input: 0, probe: 1, elems, bias, fStart: 1000, fStop: 1000, points: 1 });
    const id = (5 - bias[1]) / 1000;
    const rd = 0.02585 / (id + 1e-14);
    const expDb = 20 * Math.log10(rd / (1000 + rd));
    expect(res.magDb[0]).toBeCloseTo(expDb, 0);
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
