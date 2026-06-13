import { describe, it, expect } from "vitest";
import {
  importKicadSymLib, LIBRARY, loadStoredUserParts, makeUserPart, saveStoredUserParts,
  setRuntimeUserParts,
} from "./library.ts";
import { pinsOf } from "../project.ts";
import { deserialize, emptyProject, serialize } from "../project.ts";

describe("component library", () => {
  it("has parts with valid kind, value, footprint, unique ids", () => {
    expect(LIBRARY.length).toBeGreaterThan(15);
    const ids = new Set<string>();
    for (const p of LIBRARY) {
      expect(pinsOf(p.kind).length).toBeGreaterThan(0); // известный kind
      expect(p.value).toBeTruthy();
      expect(p.footprint).toBeTruthy();
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
    }
  });
});

describe("user parts (phase 14)", () => {
  it("round-trips through .ucp and localStorage", () => {
    const part = makeUserPart({
      name: "My Sensor",
      baseKind: "U",
      value: "SENSOR",
      footprint: "SOIC-8",
      pins: [
        { num: "1", name: "VCC", side: "L", type: "power_in" },
        { num: "2", name: "OUT", side: "R", type: "out" },
      ],
    }, []);
    const p = { ...emptyProject(), userParts: [part] };
    expect(deserialize(serialize(p)).userParts?.[0].pins.map((x) => x.num)).toEqual(["1", "2"]);

    const mem = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v) },
      configurable: true,
    });
    saveStoredUserParts([part]);
    expect(loadStoredUserParts()[0].name).toBe("My Sensor");
  });

  it("pinsOf uses custom kind definitions", () => {
    const part = makeUserPart({
      name: "My OpAmp",
      baseKind: "U",
      pins: [
        { num: "3", name: "IN+", side: "L", type: "in" },
        { num: "2", name: "IN-", side: "L", type: "in" },
        { num: "6", name: "OUT", side: "R", type: "out" },
      ],
    }, []);
    setRuntimeUserParts([part]);
    expect(pinsOf(part.kind)).toEqual(["3", "2", "6"]);
    setRuntimeUserParts([]);
  });

  it("imports .kicad_sym into user parts", () => {
    const text = `
      (kicad_symbol_lib (version 20231120)
        (symbol "Device:R"
          (property "Reference" "R" (at 0 0 0))
          (property "Value" "R" (at 0 0 0))
          (property "Footprint" "Resistor_SMD:R_0805" (at 0 0 0))
          (pin passive line (at -2.54 0 0) (length 2.54) (name "~") (number "1"))
          (pin passive line (at 2.54 0 180) (length 2.54) (name "~") (number "2")))
        (symbol "Amplifier:LM358"
          (property "Reference" "U" (at 0 0 0))
          (property "Value" "LM358" (at 0 0 0))
          (property "Footprint" "Package_SO:SOIC-8" (at 0 0 0))
          (pin input line (at -2.54 0 0) (length 2.54) (name "IN+") (number "3"))
          (pin output line (at 2.54 0 180) (length 2.54) (name "OUT") (number "1"))))
    `;
    const parts = importKicadSymLib(text, []);
    expect(parts).toHaveLength(2);
    expect(parts[0].footprint).toBe("Resistor_SMD:R_0805");
    expect(parts[1].pins.map((p) => [p.num, p.type])).toEqual([["3", "in"], ["1", "out"]]);
  });
});
