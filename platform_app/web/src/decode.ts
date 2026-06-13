import type { PacketField } from "./design.ts";

export interface DecodedPacket {
  offset: number;
  length: number;
  fields: Record<string, number>;
  fieldBytes: Record<string, number[]>;
  crcOk: boolean | null;
}

export interface DecodeResult {
  packets: DecodedPacket[];
  garbage: number[];
  remainder: number[];
}

export function parseHexBytes(text: string): number[] {
  return (text.match(/[0-9a-fA-F]{2}/g) ?? []).map((h) => parseInt(h, 16));
}

export function formatHexBytes(bytes: ArrayLike<number>): string {
  return Array.from(bytes).map((b) => (b & 0xff).toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function crc16Ccitt(bytes: ArrayLike<number>, init = 0xffff): number {
  let crc = init & 0xffff;
  for (const b of Array.from(bytes)) {
    crc ^= (b & 0xff) << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc & 0xffff;
}

function fieldValueBytes(f: PacketField): number[] {
  const out: number[] = [];
  for (let i = f.bytes - 1; i >= 0; i--) out.push((f.value >> (i * 8)) & 0xff);
  return out;
}

function readBE(bytes: number[]): number {
  return bytes.reduce((s, b) => ((s << 8) | (b & 0xff)) >>> 0, 0);
}

export function decodePackets(bytes: ArrayLike<number>, fields: PacketField[]): DecodeResult {
  const stream = Array.from(bytes).map((b) => b & 0xff);
  const schema = fields.filter((f) => f.bytes > 0);
  const total = schema.reduce((s, f) => s + f.bytes, 0);
  if (!schema.length || total <= 0) return { packets: [], garbage: stream, remainder: [] };
  const first = schema[0];
  const hasSync = /^(header|sync|magic)$/i.test(first.name);
  const sync = fieldValueBytes(first);
  const crcIndex = schema.findIndex((f) => /crc/i.test(f.name));
  const crcOffset = crcIndex >= 0 ? schema.slice(0, crcIndex).reduce((s, f) => s + f.bytes, 0) : -1;
  const packets: DecodedPacket[] = [];
  const garbage: number[] = [];
  let i = 0;

  while (i + total <= stream.length) {
    if (hasSync && sync.some((b, j) => stream[i + j] !== b)) {
      garbage.push(stream[i++]);
      continue;
    }
    let off = i;
    const values: Record<string, number> = {};
    const fieldBytes: Record<string, number[]> = {};
    for (const f of schema) {
      const slice = stream.slice(off, off + f.bytes);
      fieldBytes[f.name] = slice;
      values[f.name] = readBE(slice);
      off += f.bytes;
    }
    let crcOk: boolean | null = null;
    if (crcIndex >= 0) {
      const got = values[schema[crcIndex].name] & 0xffff;
      const calc = crc16Ccitt(stream.slice(i, i + crcOffset));
      crcOk = got === calc;
    }
    packets.push({ offset: i, length: total, fields: values, fieldBytes, crcOk });
    i += total;
    if (!hasSync) break;
  }

  const remainder = stream.slice(i);
  return { packets, garbage, remainder };
}
