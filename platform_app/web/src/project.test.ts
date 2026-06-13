import { afterEach, describe, it, expect } from "vitest";
import {
  emptyProject, serialize, deserialize, nextRef, runDrc, computeNets, exportNetlist,
  importNetlist, importKicadSch, exportBom, pinOffset,
  findJunctions, runErc, buildClipboard, pasteClipboard,
} from "./project.ts";
import { fsm, packet, uiDesign, uiProject, type UiProjectDesign } from "./design.ts";

const DEFAULT_UI = uiDesign.snapshot();
const DEFAULT_UI_PROJECT = uiProject.snapshot();
const DEFAULT_PACKET = packet.snapshot();
const DEFAULT_FSM = fsm.snapshot();

afterEach(() => {
  uiProject.restore(DEFAULT_UI_PROJECT);
  uiDesign.restore(DEFAULT_UI);
  packet.restore(DEFAULT_PACKET);
  fsm.restore(DEFAULT_FSM);
});

describe("project serialize/deserialize", () => {
  it("round-trips an empty project", () => {
    const p = emptyProject("My Board");
    const back = deserialize(serialize(p));
    expect(back).toEqual(p);
  });

  it("fills defaults for partial components", () => {
    const p = deserialize('{"name":"X","components":[{"ref":"R5"}]}');
    expect(p.name).toBe("X");
    expect(p.components[0]).toMatchObject({ ref: "R5", kind: "U", value: "", x: 0, y: 0 });
  });

  it("throws on invalid input", () => {
    expect(() => deserialize("{}")).toThrow();
    expect(() => deserialize("not json")).toThrow();
  });

  it("round-trips wires", () => {
    const p = emptyProject();
    p.wires.push({ from: { ref: "C1", pin: "2" }, to: { ref: "U1", pin: "1" } });
    expect(deserialize(serialize(p)).wires).toEqual(p.wires);
  });

  it("writes .ucp v2 with design stores and restores them", () => {
    const widgets = [{ id: 11, type: "Image", x: 7, y: 8, w: 90, h: 40, text: "Dry", assetId: "img_dryer" }];
    const fields = [
      { id: 21, name: "header", bytes: 1, value: 0xA5 },
      { id: 22, name: "temp", bytes: 2, value: 60 },
    ];
    const machine = {
      name: "DryerLab",
      initial: "idle",
      states: [
        { id: "idle", name: "IDLE", x: 120, y: 120 },
        { id: "heat", name: "HEAT", x: 280, y: 120, entry: "heater_on();" },
      ],
      transitions: [{ from: "idle", to: "heat", event: "START" }],
    };
    uiDesign.restore(widgets);
    packet.restore(fields);
    fsm.restore(machine);

    const text = serialize(emptyProject("Design Bundle"));
    const file = JSON.parse(text);
    expect(file.version).toBe(2);
    expect(file.project.name).toBe("Design Bundle");
    expect(file.design.uiDesign).toEqual(widgets);
    expect(file.design.uiProject.screens[0].widgets).toEqual(widgets);
    expect(file.design.packet).toEqual(fields);
    expect(file.design.fsm.name).toBe("DryerLab");

    uiProject.restore({ initialScreenId: "main", screens: [{ id: "main", widgets: [] }] });
    uiDesign.restore([]);
    packet.restore([]);
    fsm.restore({ name: "Blank", initial: "", states: [], transitions: [] });
    const project = deserialize(text);
    expect(project.name).toBe("Design Bundle");
    expect(uiDesign.get()).toEqual(widgets);
    expect(uiProject.get().screens[0].widgets).toEqual(widgets);
    expect(packet.get()).toEqual(fields);
    expect(fsm.get()).toEqual(machine);
  });

  it("round-trips multi-screen UI project state in .ucp v2", () => {
    const multi: UiProjectDesign = {
      initialScreenId: "main",
      screens: [
        { id: "main", title: "Main", widgets: [{ id: 1, type: "Label", x: 1, y: 2, w: 80, h: 24, text: "Home" }] },
        {
          id: "settings",
          title: "Settings",
          widgets: [
            {
              id: 1,
              type: "Image",
              x: 5,
              y: 6,
              w: 90,
              h: 32,
              text: "Back",
              assetId: "img_settings",
              event: { code: "clicked", handler: "on_settings_back", action: { kind: "screen_load", targetScreenId: "main" } },
              style: { bgColor: "#1f6feb", radius: 8 },
            },
            { id: 2, type: "Panel", x: 8, y: 44, w: 120, h: 48, text: "", layout: { kind: "flex_row", gap: 5 } },
          ],
        },
      ],
    };
    uiProject.restore(multi);

    const text = serialize(emptyProject("Screen Bundle"));
    const file = JSON.parse(text);
    expect(file.design.uiProject).toEqual(multi);

    uiProject.restore({ initialScreenId: "main", screens: [{ id: "main", widgets: [] }] });
    deserialize(text);
    expect(uiProject.get()).toEqual(multi);
    expect(uiDesign.get()).toEqual(multi.screens[0].widgets);
  });

  it("migrates legacy .ucp v2 uiDesign into a single-screen uiProject", () => {
    const widgets = [{ id: 9, type: "Image", x: 2, y: 3, w: 44, h: 22, text: "Legacy UI", assetId: "img_legacy" }];
    const text = JSON.stringify({
      version: 2,
      project: emptyProject("Legacy UI Bundle"),
      design: { uiDesign: widgets },
    });

    uiProject.restore({ initialScreenId: "main", screens: [{ id: "main", widgets: [] }] });
    uiDesign.restore([]);
    deserialize(text);

    expect(uiDesign.get()).toEqual(widgets);
    expect(uiProject.get()).toEqual({
      initialScreenId: "main",
      screens: [{ id: "main", title: "Main", widgets }],
    });
  });

  it("opens legacy .ucp v1 without touching design stores", () => {
    const widgets = [{ id: 3, type: "Label", x: 1, y: 2, w: 30, h: 12, text: "keep" }];
    const fields = [{ id: 7, name: "cmd", bytes: 1, value: 3 }];
    const machine = { name: "Keep", initial: "s", states: [{ id: "s", name: "S", x: 1, y: 1 }], transitions: [] };
    uiDesign.restore(widgets);
    packet.restore(fields);
    fsm.restore(machine);

    const project = deserialize('{"name":"Legacy","components":[{"ref":"R5"}]}');
    expect(project.name).toBe("Legacy");
    expect(uiDesign.get()).toEqual(widgets);
    expect(packet.get()).toEqual(fields);
    expect(fsm.get()).toEqual(machine);
  });

  it("drops wires referencing missing components", () => {
    const p = deserialize('{"name":"X","components":[{"ref":"R1"}],"wires":[{"from":{"ref":"R1","pin":"1"},"to":{"ref":"Z9","pin":"2"}}]}');
    expect(p.wires).toEqual([]);
  });

  it("defaults wires to [] when absent", () => {
    const p = deserialize('{"name":"X","components":[{"ref":"R1"}]}');
    expect(p.wires).toEqual([]);
  });
});

describe("runDrc", () => {
  it("reports floating pins and one net for the default project", () => {
    // default: R1,C1 (2 pins each) + U1 (6 pins) = 10 pins; wire R1.2-C1.1
    const r = runDrc(emptyProject());
    expect(r.nets).toBe(1);
    expect(r.unrouted).toBe(1);
    expect(r.floating).toContain("R1.1");
    expect(r.floating).toContain("U1.6");
    expect(r.floating).not.toContain("R1.2"); // wired
    expect(r.errors).toBe(8);                  // 10 pins - 2 wired
  });

  it("merges pins into one net transitively", () => {
    const p = emptyProject();
    p.wires.push({ from: { ref: "C1", pin: "2" }, to: { ref: "U1", pin: "1" } });
    const r = runDrc(p);
    expect(r.nets).toBe(2);
    expect(r.errors).toBe(6); // 4 pins now wired
  });
});

describe("computeNets / exportNetlist", () => {
  it("computes the single default net", () => {
    const nets = computeNets(emptyProject());
    expect(nets).toHaveLength(1);
    expect(nets[0].pins.sort()).toEqual(["C1.1", "R1.2"]);
  });

  it("exports a netlist with components and nets", () => {
    const txt = exportNetlist(emptyProject());
    expect(txt).toContain('(comp (ref "U1")');
    expect(txt).toContain('(net (name "N$1")');
    expect(txt).toContain('(node (ref "R1") (pin "2"))');
    // сбалансированные скобки
    expect((txt.match(/\(/g) ?? []).length).toBe((txt.match(/\)/g) ?? []).length);
  });

  it("import(export) round-trips components and nets", () => {
    const p = emptyProject();
    const back = importNetlist(exportNetlist(p), "RT");
    expect(back.components.map((c) => c.ref).sort()).toEqual(["C1", "R1", "U1"]);
    expect(computeNets(back)).toHaveLength(1);           // same single net
    expect(back.components.find((c) => c.ref === "R1")?.value).toBe("10k");
  });

  it("imports components + wired nets from a .kicad_sch (skips #PWR)", () => {
    const sch = `(kicad_sch
      (lib_symbols
        (symbol "Device:R" (symbol "R_1_1" (pin (at 0 3.81 270) (number "1")) (pin (at 0 -3.81 90) (number "2"))))
        (symbol "Device:C" (symbol "C_1_1" (pin (at 0 3.81 270) (number "1")) (pin (at 0 -3.81 90) (number "2")))))
      (symbol (lib_id "Device:R") (at 100 100 0) (property "Reference" "R1") (property "Value" "10k"))
      (symbol (lib_id "Device:C") (at 100 90 0) (property "Reference" "C1") (property "Value" "100n"))
      (symbol (lib_id "power:GND") (at 100 110 0) (property "Reference" "#PWR01") (property "Value" "GND"))
      (wire (pts (xy 100 96.19) (xy 100 93.81))))`;
    const p = importKicadSch(sch);
    expect(p.components.map((c) => `${c.ref}:${c.kind}:${c.value}`)).toEqual(["R1:R:10k", "C1:C:100n"]);
    // провод соединил R1.pin1 (100,96.19) и C1.pin2 (100,93.81)
    expect(p.wires).toEqual([{ from: { ref: "R1", pin: "1" }, to: { ref: "C1", pin: "2" } }]);
  });

  it("parses a KiCad-style netlist and infers kinds", () => {
    const kicad = `(export (version "E")
      (components (comp (ref "R5") (value "1k")) (comp (ref "U2") (value "ATmega")))
      (nets (net (name "/N") (node (ref "R5") (pin "2")) (node (ref "U2") (pin "1")))))`;
    const p = importNetlist(kicad);
    expect(p.components.map((c) => `${c.ref}:${c.kind}`)).toEqual(["R5:R", "U2:U"]);
    expect(p.wires).toEqual([{ from: { ref: "R5", pin: "2" }, to: { ref: "U2", pin: "1" } }]);
  });
});

describe("exportBom", () => {
  it("groups by kind+value with footprint column", () => {
    const p = emptyProject();
    p.components.push({ id: "x", ref: "R2", kind: "R", value: "10k", x: 0, y: 0, footprint: "R_0805" });
    p.components[0].footprint = "R_0805";
    const lines = exportBom(p).split("\n");
    expect(lines[0]).toBe("Designators,Value,Kind,Footprint,Quantity");
    expect(lines.find((l) => l.includes("10k"))).toBe('"R1, R2",10k,R,R_0805,2');
    expect(lines).toHaveLength(4);
  });
});

describe("net labels", () => {
  it("connect pins into a named net without a wire; not floating", () => {
    const p = emptyProject();
    p.labels.push({ ref: "R1", pin: "1", net: "GND" }, { ref: "U1", pin: "6", net: "GND" });
    const gnd = computeNets(p).find((n) => n.name === "GND");
    expect(gnd?.pins.sort()).toEqual(["R1.1", "U1.6"]);
    const drc = runDrc(p);
    expect(drc.floating).not.toContain("R1.1");
    expect(drc.floating).not.toContain("U1.6");
  });
});

describe("pinOffset rotation", () => {
  it("rotates the pin offset by component angle", () => {
    expect(pinOffset("R", "2")).toEqual({ dx: 24, dy: 0 });        // базовое
    const r90 = pinOffset("R", "2", 90);
    expect(Math.round(r90.dx)).toBe(0);
    expect(Math.round(r90.dy)).toBe(24);
    const r180 = pinOffset("R", "2", 180);
    expect(Math.round(r180.dx)).toBe(-24);
    expect(Math.round(r180.dy)).toBe(0);
  });
});

describe("nextRef", () => {
  it("allocates the next free refdes per kind", () => {
    const comps = emptyProject().components; // R1, C1, U1
    expect(nextRef(comps, "R")).toBe("R2");
    expect(nextRef(comps, "C")).toBe("C2");
    expect(nextRef(comps, "L")).toBe("L1");
  });
});

describe("findJunctions (фаза 13)", () => {
  it("T-соединение: вывод в ≥2 проводах — junction, прямой провод — нет", () => {
    const p = emptyProject(); // wire R1.2-C1.1
    expect(findJunctions(p)).toEqual([]);
    p.wires.push({ from: { ref: "C1", pin: "1" }, to: { ref: "U1", pin: "1" } });
    expect(findJunctions(p)).toEqual([{ ref: "C1", pin: "1" }]);
  });
});

describe("runErc: типы пинов (фаза 13)", () => {
  it("два выхода U в одной цепи → конфликт", () => {
    const p = emptyProject();
    p.components.push({ id: "u2", ref: "U2", kind: "U", value: "ATmega328P", x: 0, y: 0 });
    // U1.4 (out) — U2.4 (out)
    p.wires.push({ from: { ref: "U1", pin: "4" }, to: { ref: "U2", pin: "4" } });
    const r = runErc(p);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].pins.sort()).toEqual(["U1.4", "U2.4"]);
  });
  it("вход + выход → чисто", () => {
    const p = emptyProject();
    p.components.push({ id: "u2", ref: "U2", kind: "U", value: "ATmega328P", x: 0, y: 0 });
    p.wires.push({ from: { ref: "U1", pin: "4" }, to: { ref: "U2", pin: "2" } }); // out → in
    expect(runErc(p).conflicts).toHaveLength(0);
  });
  it("power_in: цепь с меткой VCC запитана, без метки — нет", () => {
    const p = emptyProject();
    p.wires.push({ from: { ref: "U1", pin: "1" }, to: { ref: "R1", pin: "1" } }); // VCC-пин к резистору
    expect(runErc(p).unpowered).toContain("U1.1");
    p.labels.push({ ref: "U1", pin: "1", net: "VCC" });
    expect(runErc(p).unpowered).not.toContain("U1.1");
  });
  it("выход LDO (power_out) запитывает цепь без метки", () => {
    const p = emptyProject();
    p.components.push({ id: "ldo", ref: "U2", kind: "U", value: "AMS1117-3.3", x: 0, y: 0 });
    p.wires.push({ from: { ref: "U2", pin: "4" }, to: { ref: "U1", pin: "1" } }); // LDO out → MCU VCC
    expect(runErc(p).unpowered).not.toContain("U1.1");
  });
});

describe("clipboard: copy/paste (фаза 13)", () => {
  it("вставка переименовывает refs и перенаправляет провода/метки", () => {
    const p = emptyProject();   // R1, C1, U1; wire R1.2-C1.1
    p.labels.push({ ref: "R1", pin: "1", net: "VCC" });
    const clip = buildClipboard(p, new Set(["R1", "C1"]));
    expect(clip.components.map((c) => c.ref).sort()).toEqual(["C1", "R1"]);
    expect(clip.wires).toHaveLength(1);   // внутренний провод
    expect(clip.labels).toHaveLength(1);
    const pasted = pasteClipboard(p, clip, 40);
    expect(pasted.components.map((c) => c.ref).sort()).toEqual(["C2", "R2"]);
    expect(pasted.wires).toEqual([{ from: { ref: "R2", pin: "2" }, to: { ref: "C2", pin: "1" } }]);
    expect(pasted.labels).toEqual([{ ref: "R2", pin: "1", net: "VCC" }]);
    // id уникальны, позиции смещены
    expect(new Set(pasted.components.map((c) => c.id)).size).toBe(2);
    expect(pasted.components[0].x).toBe(p.components[0].x + 40);
  });
  it("провод наружу выделения не копируется", () => {
    const p = emptyProject();
    const clip = buildClipboard(p, new Set(["R1"]));   // провод R1.2-C1.1 наружу
    expect(clip.wires).toHaveLength(0);
  });
});
