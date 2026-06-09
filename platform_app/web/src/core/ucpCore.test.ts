import { describe, it, expect } from "vitest";
import { crc, pidStep, rcLowpass, connectedComponents, type CrcParams } from "./ucpCore.ts";

// В node WASM не загружен → проверяем JS-фолбэк (он 1:1 с C++-ядром).
const bytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

const CRC32: CrcParams = { poly: 0x04C11DB7, init: 0xFFFFFFFF, xorOut: 0xFFFFFFFF, refIn: true, refOut: true, bits: 32 };
const CRC16_CCITT: CrcParams = { poly: 0x1021, init: 0xFFFF, xorOut: 0x0000, refIn: false, refOut: false, bits: 16 };
const CRC8: CrcParams = { poly: 0x07, init: 0x00, xorOut: 0x00, refIn: false, refOut: false, bits: 8 };

describe("crc (reference vectors for '123456789')", () => {
  it("CRC-32 = 0xCBF43926", () => { expect(crc(bytes("123456789"), CRC32) >>> 0).toBe(0xCBF43926); });
  it("CRC-16/CCITT-FALSE = 0x29B1", () => { expect(crc(bytes("123456789"), CRC16_CCITT)).toBe(0x29B1); });
  it("CRC-8 = 0xF4", () => { expect(crc(bytes("123456789"), CRC8)).toBe(0xF4); });
  it("empty input = init^xorOut", () => { expect(crc(new Uint8Array(), CRC32) >>> 0).toBe(0); });
});

describe("connectedComponents (union-find)", () => {
  it("groups by edges, normalized ids in first-seen order", () => {
    // 0-1, 2-3, 4 isolated
    expect(connectedComponents(5, [0, 1, 2, 3])).toEqual([0, 0, 1, 1, 2]);
  });
  it("chains merge transitively", () => {
    expect(connectedComponents(4, [0, 1, 1, 2, 2, 3])).toEqual([0, 0, 0, 0]);
  });
  it("ignores out-of-range edges", () => {
    expect(connectedComponents(2, [0, 9, -1, 1])).toEqual([0, 1]);
  });
});

describe("pidStep", () => {
  it("returns the requested number of samples", () => {
    expect(pidStep(2, 0.5, 0.1, 100, 200)).toHaveLength(200);
  });
  it("converges toward the setpoint", () => {
    const out = pidStep(2, 0.5, 0.1, 100, 200);
    const last = out[out.length - 1];
    expect(last).toBeGreaterThan(90);
    expect(last).toBeLessThan(110);
  });
});

describe("rcLowpass", () => {
  it("attenuates above the cutoff frequency", () => {
    // fc = 1/(2*pi*R*C); R=1000, C=200uF -> fc ~ 0.8 Hz, f=2 Hz attenuated
    const out = rcLowpass(1000, 200e-6, 1, 2, 1, 400);
    const peak = Math.max(...out.map(Math.abs));
    expect(peak).toBeLessThan(1);      // below input amplitude
    expect(peak).toBeGreaterThan(0.1); // but not killed entirely
  });
});
