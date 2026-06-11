import { describe, expect, it } from "vitest";
import { LineBuffer, parseTelemetry, formatBytes } from "./serial.ts";

const enc = (s: string) => new TextEncoder().encode(s);

describe("LineBuffer", () => {
  it("собирает строку, порванную между чанками", () => {
    const lb = new LineBuffer();
    expect(lb.push(enc("T:26"))).toEqual([]);
    expect(lb.push(enc(".1 S:60\n"))).toEqual(["T:26.1 S:60"]);
  });

  it("несколько строк в одном чанке, CRLF/LF/CR", () => {
    const lb = new LineBuffer();
    expect(lb.push(enc("a\r\nb\nc\rd"))).toEqual(["a", "b", "c"]);
    expect(lb.push(enc("\n"))).toEqual(["d"]);
  });

  it("пустые строки отбрасываются", () => {
    const lb = new LineBuffer();
    expect(lb.push(enc("\r\n\r\nx\r\n"))).toEqual(["x"]);
  });

  it("UTF-8, порванный посреди символа", () => {
    const lb = new LineBuffer();
    const bytes = enc("т:25\n"); // кириллица = 2 байта
    expect(lb.push(bytes.slice(0, 1))).toEqual([]);
    expect(lb.push(bytes.slice(1))).toEqual(["т:25"]);
  });
});

describe("parseTelemetry", () => {
  it("полная строка T/S/O", () => {
    expect(parseTelemetry("T:26.1 S:60 O:128")).toEqual({ t: 26.1, s: 60, o: 128 });
  });

  it("частичная строка и отрицательные значения", () => {
    expect(parseTelemetry("T:-3.5")).toEqual({ t: -3.5 });
    expect(parseTelemetry("log: S: 45")).toEqual({ s: 45 });
  });

  it("мусор → null", () => {
    expect(parseTelemetry("hello world")).toBeNull();
    expect(parseTelemetry("")).toBeNull();
  });
});

describe("formatBytes", () => {
  it("hex", () => {
    expect(formatBytes([0xaa, 0x03, 0x0f], "hex")).toBe("AA 03 0F");
  });
  it("ascii с заменой непечатных", () => {
    expect(formatBytes([0x41, 0x42, 0x0a], "ascii")).toBe("AB.");
  });
});
