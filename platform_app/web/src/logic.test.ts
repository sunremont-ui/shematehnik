import { describe, expect, it } from "vitest";
import {
  decodeI2c, decodeUart, findChannel, parseLogicCsv, parseVcd,
  type LogicBit, type LogicCapture, type LogicChannel,
} from "./logic.ts";

function channel(name: string, bits: Array<[number, LogicBit]>): LogicChannel {
  return { name, changes: bits.map(([time, value]) => ({ time, value })) };
}

function uartByte(byte: number, baud: number): LogicChannel {
  const bit = 1 / baud;
  const changes: Array<[number, LogicBit]> = [[0, 1], [bit, 0]];
  let prev: LogicBit = 0;
  for (let i = 0; i < 8; i++) {
    const value = ((byte >> i) & 1) as LogicBit;
    if (value !== prev) changes.push([bit * (2 + i), value]);
    prev = value;
  }
  if (prev !== 1) changes.push([bit * 10, 1]);
  changes.push([bit * 12, 1]);
  return channel("rx", changes);
}

function i2cAddress(addr: number, read = false): { sda: LogicChannel; scl: LogicChannel } {
  const bits = [...Array.from({ length: 8 }, (_, i) => (((addr << 1) | (read ? 1 : 0)) >> (7 - i)) & 1), 0] as LogicBit[];
  let t = 0;
  const dt = 1e-6;
  const sda: Array<[number, LogicBit]> = [[0, 1]];
  const scl: Array<[number, LogicBit]> = [[0, 1]];
  const set = (arr: Array<[number, LogicBit]>, value: LogicBit) => {
    if (arr[arr.length - 1][1] !== value) arr.push([t, value]);
  };
  t += dt; set(sda, 0); // start while SCL high
  for (const bit of bits) {
    t += dt; set(scl, 0);
    t += dt; set(sda, bit);
    t += dt; set(scl, 1);
    t += dt; set(scl, 0);
  }
  t += dt; set(sda, 0);
  t += dt; set(scl, 1);
  t += dt; set(sda, 1); // stop while SCL high
  return { sda: channel("sda", sda), scl: channel("scl", scl) };
}

describe("logic import", () => {
  it("parses CSV channels with unit-suffixed timestamps", () => {
    const cap = parseLogicCsv("time,rx,clk\n0us,1,0\n10us,0,1\n20us,1,0\n");
    expect(cap.channels.map((c) => c.name)).toEqual(["rx", "clk"]);
    expect(cap.channels[0].changes.map((c) => c.value)).toEqual([1, 0, 1]);
    expect(cap.channels[0].changes[1].time).toBeCloseTo(10e-6);
    expect(cap.channels[0].changes[2].time).toBeCloseTo(20e-6);
  });

  it("parses VCD scalar and vector variables", () => {
    const vcd = `
$timescale 1 us $end
$scope module logic $end
$var wire 1 ! rx $end
$var wire 2 " bus [1:0] $end
$enddefinitions $end
#0
1!
b10 "
#5
0!
b01 "
`;
    const cap = parseVcd(vcd);
    expect(cap.timescale).toBe("1 us");
    const rxChanges = findChannel(cap, "rx")?.changes ?? [];
    const bus1Changes = findChannel(cap, "bus[1]")?.changes ?? [];
    const bus0Changes = findChannel(cap, "bus[0]")?.changes ?? [];
    const rx = rxChanges[rxChanges.length - 1];
    const bus1 = bus1Changes[bus1Changes.length - 1];
    const bus0 = bus0Changes[bus0Changes.length - 1];
    expect(rx?.time).toBeCloseTo(5e-6); expect(rx?.value).toBe(0);
    expect(bus1?.time).toBeCloseTo(5e-6); expect(bus1?.value).toBe(0);
    expect(bus0?.time).toBeCloseTo(5e-6); expect(bus0?.value).toBe(1);
  });
});

describe("logic decoders", () => {
  it("decodes synthetic UART 0x55 at 9600 baud", () => {
    const annotations = decodeUart(uartByte(0x55, 9600), 9600);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].valid).toBe(true);
    expect(annotations[0].data?.byte).toBe(0x55);
    expect(annotations[0].label).toContain("0x55");
  });

  it("detects I2C start and address byte", () => {
    const { sda, scl } = i2cAddress(0x50, false);
    const annotations = decodeI2c(sda, scl);
    expect(annotations.map((a) => a.label)).toContain("START");
    expect(annotations.map((a) => a.label)).toContain("ADDR 0x50 W ACK");
    expect(annotations[annotations.length - 1]?.label).toBe("STOP");
  });

  it("keeps captures as plain channel arrays for UI consumption", () => {
    const cap: LogicCapture = { format: "synthetic", timescale: "s", channels: [uartByte(0xA5, 115200)] };
    expect(cap.channels[0].name).toBe("rx");
    expect(decodeUart(cap.channels[0], 115200)[0].data?.byte).toBe(0xA5);
  });
});
