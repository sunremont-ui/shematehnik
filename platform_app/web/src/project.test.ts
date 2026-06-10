import { describe, it, expect } from "vitest";
import { emptyProject, serialize, deserialize, nextRef, runDrc, computeNets, exportNetlist, importNetlist, importKicadSch, exportBom, pinOffset } from "./project.ts";

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

  it("import(export) round-trips components and nets", () => {
    const p = emptyProject();
    const back = importNetlist(exportNetlist(p), "RT");
    expect(back.components.map((c) => c.ref).sort()).toEqual(["C1", "R1", "U1"]);
    expect(computeNets(back)).toHaveLength(1);           // same single net
    expect(back.components.find((c) => c.ref === "R1")?.value).toBe("10k");
  });

  it("imports components + wired nets from a .kicad_sch (skips #PWR)", () => {
    const sch = `(kicad_sch
      (lib_symbols
        (symbol "Device:R" (symbol "R_1_1" (pin (at 0 3.81 270) (number "1")) (pin (at 0 -3.81 90) (number "2"))))
        (symbol "Device:C" (symbol "C_1_1" (pin (at 0 3.81 270) (number "1")) (pin (at 0 -3.81 90) (number "2")))))
      (symbol (lib_id "Device:R") (at 100 100 0) (property "Reference" "R1") (property "Value" "10k"))
      (symbol (lib_id "Device:C") (at 100 90 0) (property "Reference" "C1") (property "Value" "100n"))
      (symbol (lib_id "power:GND") (at 100 110 0) (property "Reference" "#PWR01") (property "Value" "GND"))
      (wire (pts (xy 100 96.19) (xy 100 93.81))))`;
    const p = importKicadSch(sch);
    expect(p.components.map((c) => `${c.ref}:${c.kind}:${c.value}`)).toEqual(["R1:R:10k", "C1:C:100n"]);
    // провод соединил R1.pin1 (100,96.19) и C1.pin2 (100,93.81)
    expect(p.wires).toEqual([{ from: { ref: "R1", pin: "1" }, to: { ref: "C1", pin: "2" } }]);
  });

  it("parses a KiCad-style netlist and infers kinds", () => {
    const kicad = `(export (version "E")
      (components (comp (ref "R5") (value "1k")) (comp (ref "U2") (value "ATmega")))
      (nets (net (name "/N") (node (ref "R5") (pin "2")) (node (ref "U2") (pin "1")))))`;
    const p = importNetlist(kicad);
    expect(p.components.map((c) => `${c.ref}:${c.kind}`)).toEqual(["R5:R", "U2:U"]);
    expect(p.wires).toEqual([{ from: { ref: "R5", pin: "2" }, to: { ref: "U2", pin: "1" } }]);
  });
});

describe("exportBom", () => {
  it("groups by kind+value and counts; CSV header", () => {
    const p = emptyProject();
    p.components.push({ id: "x", ref: "R2", kind: "R", value: "10k", x: 0, y: 0 }); // same as R1
    const lines = exportBom(p).split("\n");
    expect(lines[0]).toBe("Designators,Value,Kind,Quantity");
    const r10k = lines.find((l) => l.includes("10k"));
    expect(r10k).toBe('"R1, R2",10k,R,2'); // сгруппированы, в кавычках из-за запятой
    expect(lines).toHaveLength(4); // header + R(10k) + C(100n) + U(STM32F401)
  });
});

describe("net labels", () => {
  it("connect pins into a named net without a wire; not floating", () => {
    const p = emptyProject();
    p.labels.push({ ref: "R1", pin: "1", net: "GND" }, { ref: "U1", pin: "6", net: "GND" });
    const gnd = computeNets(p).find((n) => n.name === "GND");
    expect(gnd?.pins.sort()).toEqual(["R1.1", "U1.6"]);
    const drc = runDrc(p);
    expect(drc.floating).not.toContain("R1.1");
    expect(drc.floating).not.toContain("U1.6");
  });
});

describe("pinOffset rotation", () => {
  it("rotates the pin offset by component angle", () => {
    expect(pinOffset("R", "2")).toEqual({ dx: 24, dy: 0 });        // базовое
    const r90 = pinOffset("R", "2", 90);
    expect(Math.round(r90.dx)).toBe(0);
    expect(Math.round(r90.dy)).toBe(24);
    const r180 = pinOffset("R", "2", 180);
    expect(Math.round(r180.dx)).toBe(-24);
    expect(Math.round(r180.dy)).toBe(0);
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
