import { describe, it, expect } from "vitest";
import { rgbaToRgb565, rgbaToRgb565a8, hasInlinePixels, bytesPerPixel } from "./image.ts";

describe("rgbaToRgb565", () => {
  it("packs RGBA into little-endian RGB565", () => {
    // pixel 1 red (255,0,0) -> 0xF800 -> bytes 00 F8; pixel 2 blue (0,0,255) -> 0x001F -> bytes 1F 00
    const out = rgbaToRgb565(2, 1, [255, 0, 0, 255, 0, 0, 255, 255]);
    expect(out).toEqual({ w: 2, h: 1, format: "rgb565", data: [0x00, 0xF8, 0x1F, 0x00] });
    expect(out.data).toHaveLength(out.w * out.h * 2);
  });

  it("ignores alpha and clamps to 1x1 minimum", () => {
    const out = rgbaToRgb565(0, 0, [0, 255, 0, 0]);
    // green (0,255,0) -> 0x07E0 -> bytes E0 07
    expect(out).toEqual({ w: 1, h: 1, format: "rgb565", data: [0xE0, 0x07] });
  });
});

describe("rgbaToRgb565a8", () => {
  it("packs RGB565 plus an alpha byte (3 bytes/pixel)", () => {
    // pixel 1 red half-alpha (255,0,0,128) -> 00 F8 80; pixel 2 blue opaque (0,0,255,255) -> 1F 00 FF
    const out = rgbaToRgb565a8(2, 1, [255, 0, 0, 128, 0, 0, 255, 255]);
    expect(out).toEqual({ w: 2, h: 1, format: "rgb565a8", data: [0x00, 0xF8, 0x80, 0x1F, 0x00, 0xFF] });
    expect(out.data).toHaveLength(out.w * out.h * 3);
  });
});

describe("bytesPerPixel", () => {
  it("maps formats to bytes per pixel", () => {
    expect(bytesPerPixel("rgb565")).toBe(2);
    expect(bytesPerPixel("rgb565a8")).toBe(3);
    expect(bytesPerPixel(undefined)).toBe(0);
  });
});

describe("hasInlinePixels", () => {
  it("accepts well-formed rgb565/rgb565a8 assets and rejects mismatched data", () => {
    expect(hasInlinePixels({ id: "a", w: 2, h: 1, format: "rgb565", data: [1, 2, 3, 4] })).toBe(true);
    expect(hasInlinePixels({ id: "a", w: 2, h: 1, format: "rgb565a8", data: [1, 2, 3, 4, 5, 6] })).toBe(true);
    expect(hasInlinePixels({ id: "a", w: 2, h: 1, format: "rgb565a8", data: [1, 2, 3, 4] })).toBe(false);
    expect(hasInlinePixels({ id: "a", w: 2, h: 1, format: "rgb565", data: [1, 2] })).toBe(false);
    expect(hasInlinePixels({ id: "a", src: "x.png" })).toBe(false);
  });
});
