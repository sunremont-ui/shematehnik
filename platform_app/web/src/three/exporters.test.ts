import { describe, it, expect } from "vitest";
import { stlBinary, stlAscii, stepAP214 } from "./exporters.ts";

// два треугольника (квадрат в плоскости z=0)
const quad = [
  0, 0, 0, 1, 0, 0, 1, 1, 0,
  0, 0, 0, 1, 1, 0, 0, 1, 0,
];

describe("stlBinary", () => {
  it("заголовок 84 байта + 50/треугольник, верный счётчик", () => {
    const buf = stlBinary(quad);
    expect(buf.byteLength).toBe(84 + 2 * 50);
    const dv = new DataView(buf);
    expect(dv.getUint32(80, true)).toBe(2);
    // нормаль первого треуг. = +Z
    expect(dv.getFloat32(84, true)).toBeCloseTo(0);
    expect(dv.getFloat32(92, true)).toBeCloseTo(1); // nz
  });
});

describe("stlAscii", () => {
  it("solid/endsolid + 2 facet", () => {
    const s = stlAscii(quad, "q");
    expect(s.startsWith("solid q")).toBe(true);
    expect(s.trimEnd().endsWith("endsolid q")).toBe(true);
    expect((s.match(/facet normal/g) ?? []).length).toBe(2);
  });
});

describe("stepAP214", () => {
  it("валидный каркас ISO-10303-21 + дедуп вершин", () => {
    const s = stepAP214(quad);
    expect(s.startsWith("ISO-10303-21;")).toBe(true);
    expect(s.trimEnd().endsWith("END-ISO-10303-21;")).toBe(true);
    expect(s).toContain("TRIANGULATED_FACE_SET");
    // 4 уникальные вершины у квадрата
    expect(s).toContain("COORDINATES_LIST('',4,");
  });
});
