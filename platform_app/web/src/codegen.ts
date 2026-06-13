// ============================================================
// Генераторы кода — чистые функции из реальных артефактов дизайна.
// LVGL UI (из uiProject/uiDesign), парсер пакета и C-struct (из packet), Arduino.
// Покрыты Vitest; используются и UI Designer, и модулями CodeGen.
// ============================================================
import type {
  UiW, UiAsset, UiProjectDesign, UiScreenDesign, PacketField, FsmDesign,
  RegisterMapDesign, RegisterDef, RegField, UiEventAction,
} from "./design.ts";

// Безопасное C-имя из произвольного текста.
function cident(s: string, fallback: string): string {
  const id = s.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1");
  return id || fallback;
}
const escC = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  .replace(/[^\x20-\x7E]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));

// LVGL-конструктор по типу виджета (v8 API).
const LV_CREATE: Record<string, string> = {
  Button: "lv_btn_create", Label: "lv_label_create", Slider: "lv_slider_create",
  Switch: "lv_switch_create", Arc: "lv_arc_create", Chart: "lv_chart_create",
  Gauge: "lv_meter_create", Bar: "lv_bar_create", Panel: "lv_obj_create",
  Dropdown: "lv_dropdown_create", Checkbox: "lv_checkbox_create", Roller: "lv_roller_create",
  TextArea: "lv_textarea_create", Image: "lv_img_create", NavList: "lv_list_create",
};
const LV_EVENT: Record<string, string> = {
  clicked: "LV_EVENT_CLICKED",
  value_changed: "LV_EVENT_VALUE_CHANGED",
};
const LV_FLEX_FLOW: Record<string, string> = {
  flex_row: "LV_FLEX_FLOW_ROW",
  flex_column: "LV_FLEX_FLOW_COLUMN",
};
const LV_FLEX_ALIGN: Record<string, string> = {
  start: "LV_FLEX_ALIGN_START",
  center: "LV_FLEX_ALIGN_CENTER",
  end: "LV_FLEX_ALIGN_END",
  space_between: "LV_FLEX_ALIGN_SPACE_BETWEEN",
  space_around: "LV_FLEX_ALIGN_SPACE_AROUND",
  space_evenly: "LV_FLEX_ALIGN_SPACE_EVENLY",
};

export interface LvglOut { c: string; h: string; }
export type LvglScreenDesign = UiScreenDesign;
export type LvglProjectDesign = UiProjectDesign;
type ScreenVarResolver = (targetScreenId: string) => string | null;

function lvEventFor(w: UiW): { fn: string; code: string; action?: UiEventAction } | null {
  if (!w.event?.handler.trim()) return null;
  return {
    fn: cident(w.event.handler.trim(), `ui_event_${w.id}`),
    code: LV_EVENT[w.event.code] ?? "LV_EVENT_CLICKED",
    ...(w.event.action ? { action: w.event.action } : {}),
  };
}

function lvEventActionLines(action: UiEventAction | undefined, resolveScreen?: ScreenVarResolver): string[] {
  if (!action) return ["    /* TODO: user action */"];
  if (action.kind === "screen_load") {
    const target = resolveScreen?.(action.targetScreenId.trim());
    return target
      ? [`    lv_scr_load(${target});`]
      : ["    /* TODO: screen_load target is unavailable in this export mode */"];
  }
  return ["    /* TODO: user action */"];
}

function emitEventHandlers(out: string[], widgets: UiW[], resolveScreen?: ScreenVarResolver) {
  const emitted = new Set<string>();
  for (const w of widgets) {
    const ev = lvEventFor(w);
    if (!ev || emitted.has(ev.fn)) continue;
    emitted.add(ev.fn);
    out.push(`static void ${ev.fn}(lv_event_t *e) {`);
    out.push("    (void)e;");
    out.push(...lvEventActionLines(ev.action, resolveScreen));
    out.push("}", "");
  }
}

function lvStyleFor(w: UiW): { bgColor: string | null; radius: number | null } | null {
  const bgColor = /^#[0-9A-Fa-f]{6}$/.test(w.style?.bgColor ?? "") ? w.style!.bgColor!.slice(1).toUpperCase() : null;
  const radius = Number.isFinite(w.style?.radius) ? Math.max(0, Math.round(w.style!.radius!)) : null;
  return bgColor || radius !== null ? { bgColor, radius } : null;
}

function lvImageAssetFor(w: UiW): string | null {
  if (w.type !== "Image" || !w.assetId?.trim()) return null;
  return cident(w.assetId.trim(), "ui_image_asset");
}

function usedImageAssets(widgets: UiW[]): string[] {
  const used: string[] = [];
  const seen = new Set<string>();
  for (const w of widgets) {
    const asset = lvImageAssetFor(w);
    if (!asset || seen.has(asset)) continue;
    seen.add(asset);
    used.push(asset);
  }
  return used;
}

function emitImageAssetDecls(out: string[], widgets: UiW[]) {
  const used = usedImageAssets(widgets);
  for (const asset of used) out.push(`LV_IMG_DECLARE(${asset});`);
  if (used.length) out.push("");
}

// Project-level image assets: declare the union of the manifest and used widget
// assets, comment declared sources, and report used-but-undeclared references.
// With an empty manifest, output matches emitImageAssetDecls (legacy projects).
function emitProjectImageAssets(out: string[], widgets: UiW[], assets: UiAsset[]) {
  const declared = new Map<string, string | undefined>();
  for (const a of assets) {
    const id = cident(a.id.trim(), "");
    if (!id || declared.has(id)) continue;
    declared.set(id, a.src?.trim() || undefined);
  }
  const used = usedImageAssets(widgets);
  if (declared.size === 0) {
    emitImageAssetDecls(out, widgets);
    return;
  }
  const emitted = new Set<string>();
  for (const [id, src] of declared) {
    out.push(`LV_IMG_DECLARE(${id});${src ? ` // src: ${src}` : ""}`);
    emitted.add(id);
  }
  for (const id of used) {
    if (emitted.has(id)) continue;
    emitted.add(id);
    out.push(`LV_IMG_DECLARE(${id});`);
  }
  for (const id of used) {
    if (!declared.has(id)) out.push(`/* TODO: image asset "${id}" is used but not declared in the project asset manifest */`);
  }
  out.push("");
}

function styleNameFor(nm: string): string {
  return `${nm}_style`;
}

function emitStyleDecls(out: string[], entries: { w: UiW; nm: string }[]) {
  let any = false;
  for (const { w, nm } of entries) {
    if (!lvStyleFor(w)) continue;
    out.push(`static lv_style_t ${styleNameFor(nm)};`);
    any = true;
  }
  if (any) out.push("");
}

function emitStyleAttach(out: string[], w: UiW, nm: string) {
  const style = lvStyleFor(w);
  if (!style) return;
  const sn = styleNameFor(nm);
  out.push(`    lv_style_init(&${sn});`);
  if (style.bgColor) {
    out.push(`    lv_style_set_bg_color(&${sn}, lv_color_hex(0x${style.bgColor}));`);
    out.push(`    lv_style_set_bg_opa(&${sn}, LV_OPA_COVER);`);
  }
  if (style.radius !== null) out.push(`    lv_style_set_radius(&${sn}, ${style.radius});`);
  out.push(`    lv_obj_add_style(${nm}, &${sn}, LV_PART_MAIN | LV_STATE_DEFAULT);`);
}

function emitLayout(out: string[], w: UiW, nm: string) {
  const flow = w.layout ? LV_FLEX_FLOW[w.layout.kind] : null;
  if (!flow) return;
  out.push(`    lv_obj_set_layout(${nm}, LV_LAYOUT_FLEX);`);
  out.push(`    lv_obj_set_flex_flow(${nm}, ${flow});`);
  const main = w.layout?.align ? LV_FLEX_ALIGN[w.layout.align] : null;
  const cross = w.layout?.crossAlign ? LV_FLEX_ALIGN[w.layout.crossAlign] : null;
  const track = w.layout?.trackAlign ? LV_FLEX_ALIGN[w.layout.trackAlign] : null;
  const dft = "LV_FLEX_ALIGN_START";
  if (main || cross || track) out.push(`    lv_obj_set_flex_align(${nm}, ${main ?? dft}, ${cross ?? dft}, ${track ?? dft});`);
  const gap = Number(w.layout?.gap);
  if (Number.isFinite(gap)) {
    const n = Math.max(0, Math.round(gap));
    out.push(`    lv_obj_set_style_pad_row(${nm}, ${n}, LV_PART_MAIN | LV_STATE_DEFAULT);`);
    out.push(`    lv_obj_set_style_pad_column(${nm}, ${n}, LV_PART_MAIN | LV_STATE_DEFAULT);`);
  }
}

function emitWidget(out: string[], w: UiW, nm: string, parent: string) {
  const ctor = LV_CREATE[w.type] ?? "lv_obj_create";
  out.push("", `    ${nm} = ${ctor}(${parent});`);
  out.push(`    lv_obj_set_pos(${nm}, ${Math.round(w.x)}, ${Math.round(w.y)});`);
  out.push(`    lv_obj_set_size(${nm}, ${Math.round(w.w)}, ${Math.round(w.h)});`);
  if (w.type === "Label") out.push(`    lv_label_set_text(${nm}, "${escC(w.text)}");`);
  else if (w.type === "Button") {
    out.push(`    lv_obj_t *${nm}_lbl = lv_label_create(${nm});`);
    out.push(`    lv_label_set_text(${nm}_lbl, "${escC(w.text || "Button")}");`);
    out.push(`    lv_obj_center(${nm}_lbl);`);
  } else if (w.type === "Arc") {
    out.push(`    lv_arc_set_range(${nm}, 0, 100);`);
    out.push(`    lv_arc_set_value(${nm}, 60);`);
  } else if (w.type === "Checkbox") out.push(`    lv_checkbox_set_text(${nm}, "${escC(w.text || "Check")}");`);
  else if (w.type === "TextArea") out.push(`    lv_textarea_set_text(${nm}, "${escC(w.text)}");`);
  else if (w.type === "Image") {
    const asset = lvImageAssetFor(w);
    if (asset) out.push(`    lv_img_set_src(${nm}, &${asset});`);
    else out.push(`    /* TODO: assign assetId to emit lv_img_set_src(${nm}, &asset); */`);
  }
  else if (w.type === "Dropdown" || w.type === "Roller")
    out.push(`    ${w.type === "Dropdown" ? "lv_dropdown_set_options" : "lv_roller_set_options"}(${nm}, "${escC(w.text || "A\\nB\\nC")}"${w.type === "Roller" ? ", LV_ROLLER_MODE_NORMAL" : ""});`);
  emitLayout(out, w, nm);
  emitStyleAttach(out, w, nm);
  const ev = lvEventFor(w);
  if (ev) out.push(`    lv_obj_add_event_cb(${nm}, ${ev.fn}, ${ev.code}, NULL);`);
}

// Генерирует ui.c/ui.h для одного экрана из реальных виджетов.
function widgetsById(widgets: UiW[]): Map<number, UiW> {
  return new Map(widgets.map((w) => [w.id, w]));
}

function panelParentIdFor(w: UiW, byId: Map<number, UiW>): number | null {
  const parentId = w.parentId;
  if (w.type === "Panel" || typeof parentId !== "number" || parentId === w.id) return null;
  const parent = byId.get(parentId);
  return parent?.type === "Panel" ? parent.id : null;
}

function orderWidgetsForLvgl(widgets: UiW[]): UiW[] {
  const byId = widgetsById(widgets);
  const ordered: UiW[] = [];
  const pushed = new Set<number>();
  const push = (w: UiW) => {
    const parentId = panelParentIdFor(w, byId);
    const parent = parentId === null ? null : byId.get(parentId);
    if (parent && !pushed.has(parent.id)) push(parent);
    if (!pushed.has(w.id)) {
      ordered.push(w);
      pushed.add(w.id);
    }
  };
  for (const w of widgets) push(w);
  return ordered;
}

function parentNameFor(w: UiW, byId: Map<number, UiW>, names: Map<number, string>, screenName: string): string {
  const parentId = panelParentIdFor(w, byId);
  return parentId === null ? screenName : names.get(parentId) ?? screenName;
}

export function genLvgl(widgets: UiW[], screen = "main"): LvglOut {
  const scr = cident(screen, "main");
  const names = new Map<number, string>();
  const used = new Set<string>();
  const byId = widgetsById(widgets);
  const orderedWidgets = orderWidgetsForLvgl(widgets);
  for (const w of widgets) {
    let base = cident(`${w.type}_${w.id}`, `obj_${w.id}`);
    let n = base, k = 1;
    while (used.has(n)) n = `${base}_${k++}`;
    used.add(n); names.set(w.id, `ui_${n}`);
  }

  const c: string[] = [];
  c.push(`// ui_${scr}.c — generated by UCP UI Designer (LVGL v8)`);
  c.push(`#include "ui.h"`, "");
  emitImageAssetDecls(c, widgets);
  emitStyleDecls(c, widgets.map((w) => ({ w, nm: names.get(w.id)! })));
  c.push(`lv_obj_t *ui_${scr};`);
  for (const w of widgets) c.push(`lv_obj_t *${names.get(w.id)};`);
  emitEventHandlers(c, widgets, (target) => {
    const id = cident(target, "");
    return target === screen || id === scr ? `ui_${scr}` : null;
  });
  c.push("", `void ui_${scr}_screen_init(void) {`);
  c.push(`    ui_${scr} = lv_obj_create(NULL);`);
  c.push(`    lv_obj_clear_flag(ui_${scr}, LV_OBJ_FLAG_SCROLLABLE);`);
  for (const w of orderedWidgets) {
    emitWidget(c, w, names.get(w.id)!, parentNameFor(w, byId, names, `ui_${scr}`));
  }
  c.push("}", "");

  const h: string[] = [];
  h.push(`// ui.h — generated by UCP UI Designer`);
  h.push("#ifndef UI_H", "#define UI_H", "", "#include \"lvgl.h\"", "");
  h.push(`extern lv_obj_t *ui_${scr};`);
  for (const w of widgets) h.push(`extern lv_obj_t *${names.get(w.id)};`);
  h.push("", `void ui_${scr}_screen_init(void);`, "", "#endif // UI_H", "");
  return { c: c.join("\n"), h: h.join("\n") };
}

export function genLvglProject(project: LvglProjectDesign): LvglOut {
  const rawScreens = project.screens.length ? project.screens : [{ id: "main", widgets: [] }];
  const usedScreens = new Set<string>();
  const screens = rawScreens.map((screen, i) => {
    const fallback = i === 0 ? "main" : `screen_${i + 1}`;
    const base = cident(screen.id, fallback);
    let id = base, k = 1;
    while (usedScreens.has(id)) id = `${base}_${k++}`;
    usedScreens.add(id);
    return { ...screen, id, rawId: screen.id, widgets: screen.widgets ?? [] };
  });
  const initial = screens.find((s) => s.rawId === project.initialScreenId || s.id === project.initialScreenId) ?? screens[0];
  const namesByScreen = new Map<string, Map<number, string>>();
  for (const screen of screens) {
    const used = new Set<string>();
    const names = new Map<number, string>();
    for (const w of screen.widgets) {
      let base = cident(`${screen.id}_${w.type}_${w.id}`, `obj_${w.id}`);
      let n = base, k = 1;
      while (used.has(n)) n = `${base}_${k++}`;
      used.add(n); names.set(w.id, `ui_${n}`);
    }
    namesByScreen.set(screen.id, names);
  }
  const c: string[] = [];
  c.push(`// ui.c — generated by UCP UI Designer (LVGL v8 multi-screen)`);
  c.push(`#include "ui.h"`, "");
  emitProjectImageAssets(c, screens.flatMap((screen) => screen.widgets), project.assets ?? []);
  emitStyleDecls(c, screens.flatMap((screen) => screen.widgets.map((w) => ({ w, nm: namesByScreen.get(screen.id)!.get(w.id)! }))));
  for (const screen of screens) {
    c.push(`lv_obj_t *ui_${screen.id};`);
    for (const w of screen.widgets) c.push(`lv_obj_t *${namesByScreen.get(screen.id)!.get(w.id)};`);
  }
  const screenVarById = new Map<string, string>();
  for (const screen of screens) {
    screenVarById.set(screen.rawId, `ui_${screen.id}`);
    screenVarById.set(screen.id, `ui_${screen.id}`);
  }
  emitEventHandlers(c, screens.flatMap((screen) => screen.widgets), (target) => (
    screenVarById.get(target) ?? screenVarById.get(cident(target, target)) ?? null
  ));
  for (const screen of screens) {
    c.push("", `void ui_${screen.id}_screen_init(void) {`);
    c.push(`    ui_${screen.id} = lv_obj_create(NULL);`);
    c.push(`    lv_obj_clear_flag(ui_${screen.id}, LV_OBJ_FLAG_SCROLLABLE);`);
    const names = namesByScreen.get(screen.id)!;
    const byId = widgetsById(screen.widgets);
    for (const w of orderWidgetsForLvgl(screen.widgets)) emitWidget(c, w, names.get(w.id)!, parentNameFor(w, byId, names, `ui_${screen.id}`));
    c.push("}");
  }
  c.push("", "void ui_init(void) {");
  for (const screen of screens) c.push(`    ui_${screen.id}_screen_init();`);
  c.push(`    lv_scr_load(ui_${initial.id});`);
  c.push("}", "");

  const h: string[] = [];
  h.push(`// ui.h — generated by UCP UI Designer`);
  h.push("#ifndef UI_H", "#define UI_H", "", "#include \"lvgl.h\"", "");
  for (const screen of screens) {
    h.push(`extern lv_obj_t *ui_${screen.id};`);
    for (const w of screen.widgets) h.push(`extern lv_obj_t *${namesByScreen.get(screen.id)!.get(w.id)};`);
  }
  h.push("");
  for (const screen of screens) h.push(`void ui_${screen.id}_screen_init(void);`);
  h.push("void ui_init(void);", "", "#endif // UI_H", "");
  return { c: c.join("\n"), h: h.join("\n") };
}

// --- Packet → C struct (#pragma pack) ---
const ctypeOf = (bytes: number) => bytes === 1 ? "uint8_t" : bytes === 2 ? "uint16_t" : "uint32_t";

export function genPacketStruct(fields: PacketField[], name = "frame"): string {
  const out: string[] = [`// ${name}_t — generated by UCP Packet Editor`, "#include <stdint.h>", "",
    "#pragma pack(push, 1)", "typedef struct {"];
  const seen = new Set<string>();
  fields.forEach((f, i) => {
    let nm = cident(f.name, `f${i}`);
    while (seen.has(nm)) nm = `${nm}_`;
    seen.add(nm);
    out.push(`    ${ctypeOf(f.bytes)} ${nm};`);
  });
  out.push(`} ${name}_t;`, "#pragma pack(pop)", "");
  return out.join("\n");
}

// --- Packet → парсер (C / Python), big-endian, CRC если есть поле crc ---
export function genProtoParser(fields: PacketField[], lang: "c" | "py", name = "frame"): string {
  const total = fields.reduce((s, f) => s + f.bytes, 0);
  const header = fields[0];
  const hdrVal = header ? header.value & ((1 << (header.bytes * 8)) - 1) : 0;
  const hasCrc = fields.some((f) => /crc/i.test(f.name));
  const crcIdx = fields.findIndex((x) => /crc/i.test(x.name));
  const crcLen = fields.filter((_, i) => i < crcIdx).reduce((s, f) => s + f.bytes, 0);
  const names = new Set<string>();
  const fname = (f: PacketField, i: number) => { let n = cident(f.name, `f${i}`); while (names.has(n)) n = `${n}_`; names.add(n); return n; };

  if (lang === "c") {
    const out: string[] = [`// ${name}_parse.c — generated by UCP Protocol Code Gen`, "#include <stdint.h>", "#include <stdbool.h>", "#include <stddef.h>", ""];
    out.push("typedef struct {");
    const fn: string[] = [];
    fields.forEach((f, i) => { const n = fname(f, i); fn.push(n); out.push(`    ${ctypeOf(f.bytes)} ${n};`); });
    out.push(`} ${name}_t;`, "");
    out.push(`bool ${name}_parse(const uint8_t *buf, size_t n, ${name}_t *out) {`);
    out.push(`    if (n < ${total}${header ? ` || buf[0] != 0x${hdrVal.toString(16).toUpperCase()}` : ""}) return false;`);
    let off = 0;
    fields.forEach((f, i) => {
      const expr = f.bytes === 1 ? `buf[${off}]`
        : Array.from({ length: f.bytes }, (_, k) => `((uint32_t)buf[${off + k}] << ${(f.bytes - 1 - k) * 8})`).join(" | ");
      out.push(`    out->${fn[i]} = ${expr};`);
      off += f.bytes;
    });
    if (hasCrc) out.push(`    return crc16_ccitt(buf, ${crcLen}) == out->crc;`);
    else out.push("    return true;");
    out.push("}");
    return out.join("\n");
  }
  // Python
  const fmt = ">" + fields.map((f) => f.bytes === 1 ? "B" : f.bytes === 2 ? "H" : "I").join("");
  const fieldNames = fields.map((f, i) => fname(f, i));
  const out: string[] = [`# ${name}_parse.py — generated by UCP Protocol Code Gen`, "import struct", "",
    `def ${name}_parse(buf: bytes):`,
    `    if len(buf) < ${total}${header ? ` or buf[0] != 0x${hdrVal.toString(16).toUpperCase()}` : ""}:`,
    "        return None",
    `    ${fieldNames.join(", ")}${fieldNames.length === 1 ? "," : ""} = struct.unpack("${fmt}", buf[:${total}])`];
  if (hasCrc) out.push(`    if crc16_ccitt(buf[:${crcLen}]) != crc:`, "        return None");
  out.push(`    return dict(${fieldNames.map((n) => `${n}=${n}`).join(", ")})`);
  return out.join("\n");
}

// --- Arduino / ESP-IDF blink (параметрический) ---
export interface BlinkOpts { pin: number; baud: number; delayMs: number; target: "arduino" | "espidf"; }
export function genBlink(o: BlinkOpts): string {
  if (o.target === "arduino") {
    return `// sketch.ino — generated by UCP
#include <Arduino.h>
#define LED_PIN  ${o.pin}
#define BAUD     ${o.baud}

void setup() {
  Serial.begin(BAUD);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(${o.delayMs});
  digitalWrite(LED_PIN, LOW);
  delay(${o.delayMs});
}`;
  }
  return `// main.c — generated by UCP (ESP-IDF)
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#define LED_PIN  ${o.pin}

void app_main(void) {
  gpio_set_direction(LED_PIN, GPIO_MODE_OUTPUT);
  while (1) {
    gpio_set_level(LED_PIN, 1);
    vTaskDelay(pdMS_TO_TICKS(${o.delayMs}));
    gpio_set_level(LED_PIN, 0);
    vTaskDelay(pdMS_TO_TICKS(${o.delayMs}));
  }
}`;
}

// --- FSM → C switch-case ---
export interface FsmOut { c: string; h: string; }

function upperIdent(s: string, fallback: string): string {
  return cident(s, fallback).toUpperCase();
}

export function genFsm(design: FsmDesign): FsmOut {
  const states = design.states.length ? design.states : [{ id: "idle", name: "IDLE", x: 0, y: 0 }];
  const stateName = new Map(states.map((s, i) => [s.id, `ST_${upperIdent(s.name, `S${i}`)}`]));
  const events = ["NONE", ...Array.from(new Set(design.transitions.map((t) => t.event.trim()).filter(Boolean)))];
  const eventName = new Map(events.map((e, i) => [e, `EV_${upperIdent(e, `E${i}`)}`]));
  const initial = stateName.get(design.initial) ?? stateName.get(states[0].id)!;
  const guard = (t: { guard?: string }) => t.guard?.trim() ? ` && (${t.guard.trim()})` : "";
  const actionLines = (action?: string): string[] => {
    const lines = (action ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return lines.length ? lines.map((s) => `            ${s}`) : [];
  };

  const h: string[] = [];
  h.push(`// ${design.name || "fsm"}_fsm.h — generated by UCP Program System`);
  h.push("#ifndef UCP_FSM_H", "#define UCP_FSM_H", "", "#include <stdint.h>", "");
  h.push("typedef enum {");
  states.forEach((s, i) => h.push(`    ${stateName.get(s.id)}${i + 1 < states.length ? "," : ""}`));
  h.push("} fsm_state_t;", "");
  h.push("typedef enum {");
  events.forEach((e, i) => h.push(`    ${eventName.get(e)}${i + 1 < events.length ? "," : ""}`));
  h.push("} fsm_event_t;", "");
  h.push(`#define FSM_INITIAL ${initial}`);
  h.push("fsm_state_t fsm_step(fsm_state_t s, fsm_event_t ev);", "", "#endif // UCP_FSM_H", "");

  const c: string[] = [];
  c.push(`// ${design.name || "fsm"}_fsm.c — generated by UCP Program System`);
  c.push('#include "fsm.h"', "");
  c.push("fsm_state_t fsm_step(fsm_state_t s, fsm_event_t ev) {");
  c.push("    switch (s) {");
  for (const s of states) {
    c.push(`    case ${stateName.get(s.id)}:`);
    const outgoing = design.transitions.filter((t) => t.from === s.id);
    if (s.entry?.trim()) c.push(`        /* entry: ${s.entry.trim()} */`);
    if (!outgoing.length) c.push("        break;");
    for (const t of outgoing) {
      const ev = eventName.get(t.event.trim()) ?? "EV_NONE";
      c.push(`        if (ev == ${ev}${guard(t)}) {`);
      c.push(...actionLines(t.action));
      c.push(`            return ${stateName.get(t.to) ?? stateName.get(s.id)};`);
      c.push("        }");
    }
    c.push("        break;");
  }
  c.push("    }");
  c.push("    return s;");
  c.push("}", "");
  return { c: c.join("\n"), h: h.join("\n") };
}

// --- Register Map → C header + Markdown docs ---
function hex32(n: number, width = 2): string {
  return `0x${(n >>> 0).toString(16).toUpperCase().padStart(width, "0")}`;
}

function maskExpr(field: RegField): string {
  if (field.width >= 32) return "0xFFFFFFFF";
  const mask = (Math.pow(2, field.width) - 1) >>> 0;
  return field.lsb === 0 ? hex32(mask, 1) : `(${hex32(mask, 1)} << ${field.lsb})`;
}

function regPrefix(device: string, reg: RegisterDef): string {
  return `${upperIdent(device, "DEV")}_${upperIdent(reg.name, "REG")}`;
}

export function genRegisterHeader(map: RegisterMapDesign): string {
  const guard = `${upperIdent(map.device, "DEVICE")}_REGMAP_H`;
  const out: string[] = [
    `// ${map.device} register map — generated by UCP Register Map`,
    `#ifndef ${guard}`,
    `#define ${guard}`,
    "",
    "#include <stdint.h>",
    "",
    `#define ${upperIdent(map.device, "DEVICE")}_BASE ${hex32(map.base, 8)}`,
    "",
  ];
  for (const reg of map.registers) {
    const rp = regPrefix(map.device, reg);
    out.push(`// ${reg.desc || reg.name}`);
    out.push(`#define ${rp}_OFFSET ${hex32(reg.addr, 2)}`);
    out.push(`#define ${rp}_ADDR (${upperIdent(map.device, "DEVICE")}_BASE + ${rp}_OFFSET)`);
    out.push(`#define ${rp}_RESET ${hex32(reg.reset, 8)}`);
    for (const field of reg.fields) {
      const fp = `${rp}_${upperIdent(field.name, "FIELD")}`;
      out.push(`#define ${fp}_Pos ${field.lsb}`);
      out.push(`#define ${fp}_Msk ${maskExpr(field)}`);
      out.push(`static inline uint32_t ${fp}_GET(uint32_t reg) { return (reg & ${fp}_Msk) >> ${fp}_Pos; }`);
      if (reg.access !== "ro")
        out.push(`static inline uint32_t ${fp}_SET(uint32_t reg, uint32_t value) { return (reg & ~${fp}_Msk) | ((value << ${fp}_Pos) & ${fp}_Msk); }`);
    }
    out.push("");
  }
  out.push(`#endif // ${guard}`, "");
  return out.join("\n");
}

export function genRegisterMarkdown(map: RegisterMapDesign): string {
  const out: string[] = [
    `# ${map.device} Register Map`,
    "",
    `Base address: \`${hex32(map.base, 8)}\``,
    "",
    "| Register | Offset | Access | Reset | Description |",
    "|----------|--------|--------|-------|-------------|",
  ];
  for (const reg of map.registers)
    out.push(`| ${reg.name} | \`${hex32(reg.addr, 2)}\` | ${reg.access.toUpperCase()} | \`${hex32(reg.reset, 8)}\` | ${reg.desc ?? ""} |`);
  for (const reg of map.registers) {
    out.push("", `## ${reg.name}`, "", "| Field | Bits | Description |", "|-------|------|-------------|");
    for (const field of reg.fields) {
      const hi = field.lsb + field.width - 1;
      const bits = field.width === 1 ? `${field.lsb}` : `${hi}:${field.lsb}`;
      out.push(`| ${field.name} | ${bits} | ${field.desc ?? ""} |`);
    }
    if (!reg.fields.length) out.push("| — | — | — |");
  }
  return out.join("\n");
}
