import { describe, it, expect } from "vitest";
import { LIBRARY } from "./library.ts";
import { pinsOf } from "../project.ts";

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
