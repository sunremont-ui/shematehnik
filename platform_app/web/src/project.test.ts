import { describe, it, expect } from "vitest";
import { emptyProject, serialize, deserialize, nextRef, runDrc, computeNets, exportNetlist } from "./project.ts";

describe("project serialize/deserialize", () => {
  it("round-trips an empty project", () => {
    const p = emptyProject("My Board");
    const back = deserialize(serialize(p));
    expect(back).toEqual(p);
  });

  it("fills defaults for partial components", () => {
    const p = deserialize('{"name":"X","components":[{"ref":"R5"}]}');
    expect(p.name).toBe("X");
    expect(p.components[0]).toMatchObject({ ref: "R5", kind: "U", value: "", x: 0, y: 0 });
  });

  it("throws on invalid input", () => {
    expect(() => deserialize("{}")).toThrow();
    expect(() => deserialize("not json")).toThrow();
  });

  it("round-trips wires", () => {
    const p = emptyProject();
    p.wires.push({ from: { ref: "C1", pin: "2" }, to: { ref: "U1", pin: "1" } });
    expect(deserialize(serialize(p)).wires).toEqual(p.wires);
  });

  it("drops wires referencing missing components", () => {
    const p = deserialize('{"name":"X","components":[{"ref":"R1"}],"wires":[{"from":{"ref":"R1","pin":"1"},"to":{"ref":"Z9","pin":"2"}}]}');
    expect(p.wires).toEqual([]);
  });

  it("defaults wires to [] when absent", () => {
    const p = deserialize('{"name":"X","components":[{"ref":"R1"}]}');
    expect(p.wires).toEqual([]);
  });
});

describe("runDrc", () => {
  it("reports floating pins and one net for the default project", () => {
    // default: R1,C1 (2 pins each) + U1 (6 pins) = 10 pins; wire R1.2-C1.1
    const r = runDrc(emptyProject());
    expect(r.nets).toBe(1);
    expect(r.unrouted).toBe(1);
    expect(r.floating).toContain("R1.1");
    expect(r.floating).toContain("U1.6");
    expect(r.floating).not.toContain("R1.2"); // wired
    expect(r.errors).toBe(8);                  // 10 pins - 2 wired
  });

  it("merges pins into one net transitively", () => {
    const p = emptyProject();
    p.wires.push({ from: { ref: "C1", pin: "2" }, to: { ref: "U1", pin: "1" } });
    const r = runDrc(p);
    expect(r.nets).toBe(2);
    expect(r.errors).toBe(6); // 4 pins now wired
  });
});

describe("computeNets / exportNetlist", () => {
  it("computes the single default net", () => {
    const nets = computeNets(emptyProject());
    expect(nets).toHaveLength(1);
    expect(nets[0].pins.sort()).toEqual(["C1.1", "R1.2"]);
  });

  it("exports a netlist with components and nets", () => {
    const txt = exportNetlist(emptyProject());
    expect(txt).toContain('(comp (ref "U1")');
    expect(txt).toContain('(net (name "N$1")');
    expect(txt).toContain('(node (ref "R1") (pin "2"))');
    // сбалансированные скобки
    expect((txt.match(/\(/g) ?? []).length).toBe((txt.match(/\)/g) ?? []).length);
  });
});

describe("nextRef", () => {
  it("allocates the next free refdes per kind", () => {
    const comps = emptyProject().components; // R1, C1, U1
    expect(nextRef(comps, "R")).toBe("R2");
    expect(nextRef(comps, "C")).toBe("C2");
    expect(nextRef(comps, "L")).toBe("L1");
  });
});
