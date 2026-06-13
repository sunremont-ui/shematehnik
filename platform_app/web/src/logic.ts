export type LogicBit = 0 | 1;

export interface LogicChange {
  time: number; // seconds
  value: LogicBit;
}

export interface LogicChannel {
  name: string;
  changes: LogicChange[];
}

export interface LogicCapture {
  format: "csv" | "vcd" | "synthetic";
  timescale: string;
  channels: LogicChannel[];
}

export interface LogicAnnotation {
  protocol: "UART" | "I2C" | "SPI";
  start: number;
  end: number;
  label: string;
  channel?: string;
  data?: Record<string, number | string | boolean>;
  valid?: boolean;
}

const EPS = 1e-12;

export function normalizeCapture(capture: LogicCapture): LogicCapture {
  return {
    ...capture,
    channels: capture.channels.map((ch) => {
      const sorted = [...ch.changes]
        .filter((c) => Number.isFinite(c.time))
        .sort((a, b) => a.time - b.time);
      const changes: LogicChange[] = [];
      for (const c of sorted) {
        const value: LogicBit = c.value ? 1 : 0;
        const prev = changes[changes.length - 1];
        if (prev && Math.abs(prev.time - c.time) < EPS) prev.value = value;
        else if (!prev || prev.value !== value) changes.push({ time: Math.max(0, c.time), value });
      }
      if (!changes.length) changes.push({ time: 0, value: 0 });
      if (changes[0].time > 0) changes.unshift({ time: 0, value: changes[0].value });
      return { name: ch.name, changes };
    }),
  };
}

export function captureDuration(capture: LogicCapture): number {
  const max = Math.max(0, ...capture.channels.flatMap((ch) => ch.changes.map((c) => c.time)));
  return max || 1e-3;
}

export function findChannel(capture: LogicCapture, name: string): LogicChannel | undefined {
  return capture.channels.find((ch) => ch.name === name);
}

export function sampleValue(channel: LogicChannel, time: number): LogicBit {
  const changes = channel.changes;
  let lo = 0, hi = changes.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (changes[mid].time <= time + EPS) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return changes[ans]?.value ?? 0;
}

export function parseLogicCsv(text: string): LogicCapture {
  const rows = text.split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (rows.length < 2) throw new Error("CSV must contain a header and at least one sample row");
  const delimiter = rows[0].includes("\t") ? "\t" : rows[0].includes(";") ? ";" : ",";
  const headers = rows[0].split(delimiter).map((h) => h.trim()).filter(Boolean);
  if (headers.length < 2) throw new Error("CSV header must be time,ch0,ch1...");
  const names = headers.slice(1);
  const channels = names.map((name) => ({ name, changes: [] as LogicChange[] }));
  for (const row of rows.slice(1)) {
    const cells = row.split(delimiter).map((c) => c.trim());
    const time = parseTime(cells[0]);
    if (!Number.isFinite(time)) continue;
    names.forEach((_, i) => {
      const bit = parseBit(cells[i + 1]);
      if (bit == null) return;
      const ch = channels[i];
      const prev = ch.changes[ch.changes.length - 1];
      if (!prev || prev.value !== bit) ch.changes.push({ time, value: bit });
    });
  }
  return normalizeCapture({ format: "csv", timescale: "s", channels });
}

export function parseVcd(text: string): LogicCapture {
  const scale = parseVcdTimescale(text);
  const vars = new Map<string, { name: string; width: number }>();
  const channelMap = new Map<string, LogicChange[]>();
  let time = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("$comment")) continue;
    if (line.startsWith("$var")) {
      const parts = line.split(/\s+/);
      const end = parts.indexOf("$end");
      const width = Math.max(1, Number(parts[2]) || 1);
      const code = parts[3];
      const ref = parts.slice(4, end > 4 ? end : undefined).join(" ").replace(/\s+\[[^\]]+\]$/, "");
      vars.set(code, { name: ref || code, width });
      for (const name of channelNames(ref || code, width)) channelMap.set(name, []);
      continue;
    }
    if (line.startsWith("#")) {
      time = (Number(line.slice(1)) || 0) * scale.seconds;
      continue;
    }
    const scalar = /^([01xXzZ])(.+)$/.exec(line);
    if (scalar) {
      const [, valueText, code] = scalar;
      const v = vars.get(code.trim());
      if (!v) continue;
      const bit = valueText === "1" ? 1 : 0;
      const name = channelNames(v.name, v.width)[0];
      channelMap.get(name)?.push({ time, value: bit });
      continue;
    }
    const vector = /^b([01xXzZ]+)\s+(.+)$/.exec(line);
    if (vector) {
      const [, bitsText, code] = vector;
      const v = vars.get(code.trim());
      if (!v) continue;
      const bits = bitsText.padStart(v.width, "0").slice(-v.width);
      channelNames(v.name, v.width).forEach((name, i) => {
        channelMap.get(name)?.push({ time, value: bits[i] === "1" ? 1 : 0 });
      });
    }
  }

  const channels = Array.from(channelMap.entries()).map(([name, changes]) => ({ name, changes }));
  if (!channels.length) throw new Error("VCD contains no $var channels");
  return normalizeCapture({ format: "vcd", timescale: scale.label, channels });
}

export function parseLogicText(text: string, format: "csv" | "vcd"): LogicCapture {
  return format === "vcd" ? parseVcd(text) : parseLogicCsv(text);
}

export function decodeUart(channel: LogicChannel, baud: number, dataBits = 8): LogicAnnotation[] {
  const bitTime = 1 / Math.max(1, baud);
  const changes = channel.changes;
  const out: LogicAnnotation[] = [];
  let frameEnd = -Infinity;
  for (let i = 0; i < changes.length; i++) {
    const prev = i === 0 ? 1 : changes[i - 1].value;
    const cur = changes[i].value;
    const start = changes[i].time;
    if (!(prev === 1 && cur === 0) || start < frameEnd - EPS) continue;
    if (sampleValue(channel, start + bitTime * 0.5) !== 0) continue;
    let value = 0;
    const bits: number[] = [];
    for (let b = 0; b < dataBits; b++) {
      const bit = sampleValue(channel, start + bitTime * (1.5 + b));
      bits.push(bit);
      value |= bit << b;
    }
    const stop = sampleValue(channel, start + bitTime * (1.5 + dataBits));
    const end = start + bitTime * (1 + dataBits + 1);
    const valid = stop === 1;
    out.push({
      protocol: "UART",
      start,
      end,
      channel: channel.name,
      label: valid ? `UART 0x${hex(value, 2)}` : `UART framing 0x${hex(value, 2)}`,
      valid,
      data: { byte: value, bits: bits.join(""), baud },
    });
    frameEnd = end;
  }
  return out;
}

export function decodeI2c(sda: LogicChannel, scl: LogicChannel): LogicAnnotation[] {
  const annotations: LogicAnnotation[] = [];
  const sdaTransitions = sda.changes.map((c, i) => ({ ...c, prev: i === 0 ? c.value : sda.changes[i - 1].value }));
  const starts = sdaTransitions.filter((e) => e.prev === 1 && e.value === 0 && sampleValue(scl, e.time) === 1).map((e) => e.time);
  const stops = sdaTransitions.filter((e) => e.prev === 0 && e.value === 1 && sampleValue(scl, e.time) === 1).map((e) => e.time);

  for (const start of starts) {
    const stop = stops.find((t) => t > start) ?? Math.max(start, scl.changes[scl.changes.length - 1]?.time ?? start);
    annotations.push({ protocol: "I2C", start, end: start, label: "START", channel: sda.name, valid: true });
    const rising = scl.changes
      .map((c, i) => ({ ...c, prev: i === 0 ? c.value : scl.changes[i - 1].value }))
      .filter((e) => e.time > start + EPS && e.time < stop - EPS && e.prev === 0 && e.value === 1);
    const bits = rising.map((e) => ({ time: e.time, bit: sampleValue(sda, e.time + EPS) }));
    for (let i = 0, packet = 0; i + 8 < bits.length; i += 9, packet++) {
      const value = bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b.bit, 0);
      const ack = bits[i + 8].bit === 0;
      const aStart = bits[i].time;
      const aEnd = bits[i + 8].time;
      if (packet === 0) {
        const address = value >> 1;
        const rw = value & 1;
        annotations.push({
          protocol: "I2C",
          start: aStart,
          end: aEnd,
          label: `ADDR 0x${hex(address, 2)} ${rw ? "R" : "W"} ${ack ? "ACK" : "NACK"}`,
          channel: sda.name,
          valid: ack,
          data: { address, rw: rw ? "R" : "W", ack },
        });
      } else {
        annotations.push({
          protocol: "I2C",
          start: aStart,
          end: aEnd,
          label: `0x${hex(value, 2)} ${ack ? "ACK" : "NACK"}`,
          channel: sda.name,
          valid: ack,
          data: { byte: value, ack },
        });
      }
    }
    annotations.push({ protocol: "I2C", start: stop, end: stop, label: "STOP", channel: sda.name, valid: true });
  }
  return annotations;
}

export function decodeSpi(args: {
  mosi: LogicChannel;
  sck: LogicChannel;
  miso?: LogicChannel;
  cs?: LogicChannel;
  mode?: 0 | 1 | 2 | 3;
  bitsPerWord?: number;
}): LogicAnnotation[] {
  const mode = args.mode ?? 0;
  const bitsPerWord = args.bitsPerWord ?? 8;
  const sampleRising = mode === 0 || mode === 3;
  const edges = args.sck.changes
    .map((c, i) => ({ ...c, prev: i === 0 ? (mode >= 2 ? 1 : 0) : args.sck.changes[i - 1].value }))
    .filter((e) => sampleRising ? e.prev === 0 && e.value === 1 : e.prev === 1 && e.value === 0)
    .filter((e) => !args.cs || sampleValue(args.cs, e.time) === 0);
  const annotations: LogicAnnotation[] = [];
  for (let i = 0; i + bitsPerWord - 1 < edges.length; i += bitsPerWord) {
    const wordEdges = edges.slice(i, i + bitsPerWord);
    const mosi = wordEdges.reduce((acc, e) => (acc << 1) | sampleValue(args.mosi, e.time + EPS), 0);
    const miso = args.miso ? wordEdges.reduce((acc, e) => (acc << 1) | sampleValue(args.miso!, e.time + EPS), 0) : undefined;
    annotations.push({
      protocol: "SPI",
      start: wordEdges[0].time,
      end: wordEdges[wordEdges.length - 1].time,
      label: miso == null ? `MOSI 0x${hex(mosi, Math.ceil(bitsPerWord / 4))}` : `MOSI 0x${hex(mosi, 2)} / MISO 0x${hex(miso, 2)}`,
      channel: args.mosi.name,
      valid: true,
      data: { mosi, ...(miso == null ? {} : { miso }), mode },
    });
  }
  return annotations;
}

export function formatSeconds(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs >= 1) return `${trim(seconds)} s`;
  if (abs >= 1e-3) return `${trim(seconds * 1e3)} ms`;
  if (abs >= 1e-6) return `${trim(seconds * 1e6)} us`;
  if (abs >= 1e-9) return `${trim(seconds * 1e9)} ns`;
  return `${trim(seconds * 1e12)} ps`;
}

function parseTime(text: string): number {
  const m = /^(-?\d+(?:\.\d+)?)(?:\s*(fs|ps|ns|us|µs|ms|s))?$/i.exec((text ?? "").trim());
  if (!m) return Number.NaN;
  const n = Number(m[1]);
  const unit = (m[2] || "s").toLowerCase();
  const mul: Record<string, number> = { fs: 1e-15, ps: 1e-12, ns: 1e-9, us: 1e-6, "µs": 1e-6, ms: 1e-3, s: 1 };
  return n * (mul[unit] ?? 1);
}

function parseBit(text: string | undefined): LogicBit | null {
  const v = (text ?? "").trim().toLowerCase();
  if (["1", "h", "hi", "high", "true"].includes(v)) return 1;
  if (["0", "l", "lo", "low", "false"].includes(v)) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? (n > 0.5 ? 1 : 0) : null;
}

function parseVcdTimescale(text: string): { seconds: number; label: string } {
  const m = /\$timescale\s+(\d+)\s*(fs|ps|ns|us|µs|ms|s)\s+\$end/i.exec(text.replace(/\r?\n/g, " "));
  if (!m) return { seconds: 1, label: "1 s" };
  const amount = Number(m[1]) || 1;
  const unit = m[2].toLowerCase();
  const mul: Record<string, number> = { fs: 1e-15, ps: 1e-12, ns: 1e-9, us: 1e-6, "µs": 1e-6, ms: 1e-3, s: 1 };
  return { seconds: amount * (mul[unit] ?? 1), label: `${amount} ${unit}` };
}

function channelNames(name: string, width: number): string[] {
  if (width <= 1) return [name];
  return Array.from({ length: width }, (_, i) => `${name}[${width - 1 - i}]`);
}

function trim(n: number): string {
  return Number(n.toPrecision(4)).toString();
}

function hex(value: number, width: number): string {
  return (value >>> 0).toString(16).toUpperCase().padStart(width, "0");
}
