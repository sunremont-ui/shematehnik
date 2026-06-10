import { describe, it, expect } from "vitest";
import { crc, pidStep, rcLowpass, connectedComponents, mnaDc, type CrcParams } from "./ucpCore.ts";

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

describe("mnaDc (nodal analysis)", () => {
  it("solves a resistive voltage divider (10V, 1k/1k → 5V)", () => {
    const v = mnaDc(3, [
      { type: 1, n1: 1, n2: 0, value: 10 },     // V source 10V on node 1
      { type: 0, n1: 1, n2: 2, value: 1000 },   // R1 node1-node2
      { type: 0, n1: 2, n2: 0, value: 1000 },   // R2 node2-gnd
    ]);
    expect(v[0]).toBe(0);
    expect(v[1]).toBeCloseTo(10, 6);
    expect(v[2]).toBeCloseTo(5, 6);
  });

  it("Ohm's law: 5V across 1k draws 5mA → 2k divider gives 2/3", () => {
    const v = mnaDc(3, [
      { type: 1, n1: 1, n2: 0, value: 9 },
      { type: 0, n1: 1, n2: 2, value: 1000 },
      { type: 0, n1: 2, n2: 0, value: 2000 },
    ]);
    expect(v[2]).toBeCloseTo(6, 6); // 9 * 2k/3k
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
