// ============================================================
// Минимальный STORED (без сжатия) ZIP-райтер + CRC32. Чистые функции (Vitest),
// без внешних зависимостей. Используется для бандла LVGL-экспорта (ui.c/ui.h/README).
// ============================================================

// Стандартный CRC32 (полином 0xEDB88320), без таблицы.
export function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const u16 = (n: number) => [n & 0xFF, (n >>> 8) & 0xFF];
const u32 = (n: number) => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

export interface ZipEntry { name: string; data: string | Uint8Array; }

// Собирает несжатый ZIP из файлов. Детерминированно (нулевые mtime).
export function zipStore(files: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = Uint8Array.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
    ]);
    local.push(lh, name, data);
    const localOffset = offset;
    offset += lh.length + name.length + data.length;
    const cd = Uint8Array.from([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(localOffset),
    ]);
    central.push(cd, name);
  }
  const cdOffset = offset;
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = Uint8Array.from([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(cdSize), ...u32(cdOffset), ...u16(0),
  ]);
  const chunks = [...local, ...central, eocd];
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
