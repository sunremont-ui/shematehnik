import { describe, it, expect } from "vitest";
import { emptyProject, serialize, deserialize, nextRef } from "./project.ts";

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
});

describe("nextRef", () => {
  it("allocates the next free refdes per kind", () => {
    const comps = emptyProject().components; // R1, C1, U1
    expect(nextRef(comps, "R")).toBe("R2");
    expect(nextRef(comps, "C")).toBe("C2");
    expect(nextRef(comps, "L")).toBe("L1");
  });
});
