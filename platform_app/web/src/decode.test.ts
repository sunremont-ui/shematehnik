import { describe, expect, it } from "vitest";
import { crc16Ccitt, decodePackets, formatHexBytes } from "./decode.ts";
import type { PacketField } from "./design.ts";

const fields: PacketField[] = [
  { id: 1, name: "header", bytes: 1, value: 0xAA },
  { id: 2, name: "cmd", bytes: 1, value: 0x03 },
  { id: 3, name: "length", bytes: 2, value: 0x0004 },
  { id: 4, name: "crc", bytes: 2, value: 0 },
];

function frame(cmd = 0x03): number[] {
  const body = [0xAA, cmd, 0x00, 0x04];
  const crc = crc16Ccitt(body);
  return [...body, (crc >> 8) & 0xff, crc & 0xff];
}

describe("decodePackets", () => {
  it("decodes packet fields and valid CRC", () => {
    const res = decodePackets(frame(), fields);
    expect(res.packets).toHaveLength(1);
    expect(res.packets[0].fields).toMatchObject({ header: 0xAA, cmd: 0x03, length: 0x0004 });
    expect(res.packets[0].crcOk).toBe(true);
  });

  it("marks broken CRC as false", () => {
    const bad = frame();
    bad[5] ^= 0xff;
    const res = decodePackets(bad, fields);
    expect(res.packets[0].crcOk).toBe(false);
  });

  it("keeps garbage before packet and remainder after packet", () => {
    const bytes = [0x00, 0x55, ...frame(0x10), 0x99];
    const res = decodePackets(bytes, fields);
    expect(res.packets[0].offset).toBe(2);
    expect(formatHexBytes(res.garbage)).toBe("00 55");
    expect(formatHexBytes(res.remainder)).toBe("99");
  });
});
