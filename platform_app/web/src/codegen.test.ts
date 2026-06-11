import { describe, it, expect } from "vitest";
import { genLvgl, genPacketStruct, genProtoParser, genBlink } from "./codegen.ts";
import type { UiW, PacketField } from "./design.ts";

const widgets: UiW[] = [
  { id: 1, type: "Label", x: 10, y: 20, w: 100, h: 28, text: "Hi 60°C" },
  { id: 2, type: "Button", x: 5, y: 60, w: 120, h: 40, text: "GO" },
];
const fields: PacketField[] = [
  { id: 1, name: "header", bytes: 1, value: 0xAA },
  { id: 2, name: "cmd", bytes: 1, value: 0x03 },
  { id: 3, name: "length", bytes: 2, value: 4 },
  { id: 4, name: "crc", bytes: 2, value: 0x1A3F },
];

describe("genLvgl", () => {
  const { c, h } = genLvgl(widgets, "main");
  it("создаёт виджеты реальных типов", () => {
    expect(c).toContain("lv_label_create(ui_main)");
    expect(c).toContain("lv_btn_create(ui_main)");
    expect(c).toContain("ui_main_screen_init(void)");
  });
  it("экранирует не-ASCII в строке Label", () => {
    expect(c).toContain('lv_label_set_text(ui_Label_1, "Hi 60\\u00B0C")');
  });
  it("заголовок с extern и прототипом", () => {
    expect(h).toContain("extern lv_obj_t *ui_main;");
    expect(h).toContain("void ui_main_screen_init(void);");
  });
});

describe("genPacketStruct", () => {
  it("упакованная структура с верными типами", () => {
    const s = genPacketStruct(fields);
    expect(s).toContain("#pragma pack(push, 1)");
    expect(s).toContain("uint8_t header;");
    expect(s).toContain("uint16_t length;");
    expect(s).toContain("} frame_t;");
  });
});

describe("genProtoParser", () => {
  it("C: проверка заголовка, big-endian, CRC", () => {
    const c = genProtoParser(fields, "c");
    expect(c).toContain("buf[0] != 0xAA");
    expect(c).toContain("out->length = ((uint32_t)buf[2] << 8) | ((uint32_t)buf[3] << 0);");
    expect(c).toContain("crc16_ccitt(buf, 4) == out->crc");
  });
  it("Python: struct.unpack с верным форматом", () => {
    const py = genProtoParser(fields, "py");
    expect(py).toContain('struct.unpack(">BBHH", buf[:6])');
    expect(py).toContain("header, cmd, length, crc = ");
  });
});

describe("genBlink", () => {
  it("параметры подставляются", () => {
    expect(genBlink({ pin: 13, baud: 9600, delayMs: 250, target: "arduino" })).toContain("#define LED_PIN  13");
    expect(genBlink({ pin: 2, baud: 115200, delayMs: 100, target: "espidf" })).toContain("pdMS_TO_TICKS(100)");
  });
});
