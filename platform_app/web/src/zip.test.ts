import { describe, it, expect } from "vitest";
import { crc32, zipStore } from "./zip.ts";

const enc = (s: string) => new TextEncoder().encode(s);

describe("crc32", () => {
  it("matches canonical check values", () => {
    expect(crc32(enc("123456789")) >>> 0).toBe(0xCBF43926);
    expect(crc32(enc(""))).toBe(0);
  });
});

describe("zipStore", () => {
  it("writes a STORED zip with local header and EOCD entry count", () => {
    const zip = zipStore([{ name: "a.txt", data: "hi" }, { name: "ui.h", data: enc("X") }]);
    // local file header signature PK\x03\x04
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // EOCD is the last 22 bytes, signature PK\x05\x06
    const eocd = zip.slice(zip.length - 22);
    expect(Array.from(eocd.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
    // total entries (u16 at offset 10) == 2
    expect(eocd[10] | (eocd[11] << 8)).toBe(2);
  });

  it("embeds the per-file CRC32 in the local header", () => {
    const zip = zipStore([{ name: "a", data: "hi" }]);
    const crc = crc32(enc("hi")) >>> 0;
    // local header CRC32 is at byte offset 14 (after sig+version+flags+method+time+date)
    const got = zip[14] | (zip[15] << 8) | (zip[16] << 16) | (zip[17] << 24);
    expect(got >>> 0).toBe(crc);
  });
});
