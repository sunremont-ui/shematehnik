import { useMemo, useRef, useState } from "react";
import { genRegisterHeader, genRegisterMarkdown } from "../codegen.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { regMap, type RegField, type RegisterDef, type RegisterMapDesign } from "../design.ts";
import { useUcp } from "../store.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";

export function RegisterMapView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["regmap"];
  const map = regMap.use();
  const [selectedId, setSelectedId] = useState(map.registers[0]?.id ?? 0);
  const [preview, setPreview] = useState<"c" | "md">("c");
  const nextRegId = useRef(Math.max(0, ...map.registers.map((r) => r.id)) + 1);
  const nextFieldId = useRef(Math.max(0, ...map.registers.flatMap((r) => r.fields.map((f) => f.id))) + 1);
  const selected = map.registers.find((r) => r.id === selectedId) ?? map.registers[0];
  const header = useMemo(() => genRegisterHeader(map), [map]);
  const markdown = useMemo(() => genRegisterMarkdown(map), [map]);

  function update(fn: (old: RegisterMapDesign) => RegisterMapDesign) {
    regMap.update(fn);
    ucp.markModified();
  }

  function patchMap(patch: Partial<RegisterMapDesign>) {
    update((old) => ({ ...old, ...patch }));
  }

  function patchReg(id: number, patch: Partial<RegisterDef>) {
    update((old) => ({ ...old, registers: old.registers.map((r) => r.id === id ? { ...r, ...patch } : r) }));
  }

  function patchField(regId: number, fieldId: number, patch: Partial<RegField>) {
    update((old) => ({
      ...old,
      registers: old.registers.map((r) => r.id === regId
        ? { ...r, fields: r.fields.map((f) => f.id === fieldId ? { ...f, ...patch } : f) }
        : r),
    }));
  }

  function addRegister() {
    const id = nextRegId.current++;
    update((old) => ({
      ...old,
      registers: [...old.registers, { id, name: `REG${id}`, addr: old.registers.length * 4, access: "rw", reset: 0, fields: [] }],
    }));
    setSelectedId(id);
  }

  function addField(regId: number) {
    const id = nextFieldId.current++;
    update((old) => ({
      ...old,
      registers: old.registers.map((r) => r.id === regId
        ? { ...r, fields: [...r.fields, { id, name: `FIELD${id}`, lsb: 0, width: 1 }] }
        : r),
    }));
  }

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className="dot ok" />{map.registers.length} registers</span>
        <button className="btn" onClick={() => { downloadText(`${map.device.toLowerCase()}_regs.h`, header, "text/x-c"); ucp.setStatus("Exported register header"); }}>Download .h</button>
        <button className="btn primary" onClick={() => { downloadText(`${map.device.toLowerCase()}_registers.md`, markdown, "text/markdown"); ucp.setStatus("Exported register docs"); }}>Download .md</button>
      </>} />

      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div className="grid cols2">
            <label className="field">Device
              <input value={map.device} onChange={(e) => patchMap({ device: e.target.value })} />
            </label>
            <label className="field">Base address
              <input value={hex(map.base, 8)} onChange={(e) => patchMap({ base: parseHex(e.target.value) })} />
            </label>
          </div>
          <table className="tbl">
            <thead><tr><th>Register</th><th>Offset</th><th>Access</th><th>Reset</th><th></th></tr></thead>
            <tbody>
              {map.registers.map((reg) => (
                <tr key={reg.id} style={{ background: reg.id === selected?.id ? "var(--raised)" : undefined }}>
                  <td><input value={reg.name} onFocus={() => setSelectedId(reg.id)} onChange={(e) => patchReg(reg.id, { name: e.target.value })} style={{ width: "100%" }} /></td>
                  <td><input value={hex(reg.addr, 2)} onFocus={() => setSelectedId(reg.id)} onChange={(e) => patchReg(reg.id, { addr: parseHex(e.target.value) })} style={{ width: 82 }} /></td>
                  <td>
                    <select value={reg.access} onFocus={() => setSelectedId(reg.id)} onChange={(e) => patchReg(reg.id, { access: e.target.value as RegisterDef["access"] })}>
                      <option value="rw">RW</option><option value="ro">RO</option><option value="wo">WO</option>
                    </select>
                  </td>
                  <td><input value={hex(reg.reset, 8)} onFocus={() => setSelectedId(reg.id)} onChange={(e) => patchReg(reg.id, { reset: parseHex(e.target.value) })} style={{ width: 108 }} /></td>
                  <td><button className="btn" onClick={() => update((old) => ({ ...old, registers: old.registers.filter((r) => r.id !== reg.id) }))}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" onClick={addRegister}>+ Add register</button>
        </div>

        <div className="card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h3 style={{ margin: 0 }}>{selected ? `${selected.name} fields` : "Fields"}</h3>
          {selected && <>
            <label className="field">Description
              <input value={selected.desc ?? ""} onChange={(e) => patchReg(selected.id, { desc: e.target.value })} />
            </label>
            <table className="tbl">
              <thead><tr><th>Field</th><th>LSB</th><th>Width</th><th>Description</th><th></th></tr></thead>
              <tbody>
                {selected.fields.map((field) => (
                  <tr key={field.id}>
                    <td><input value={field.name} onChange={(e) => patchField(selected.id, field.id, { name: e.target.value })} style={{ width: "100%" }} /></td>
                    <td><input type="number" min={0} max={31} value={field.lsb} onChange={(e) => patchField(selected.id, field.id, { lsb: clamp(+e.target.value, 0, 31) })} style={{ width: 62 }} /></td>
                    <td><input type="number" min={1} max={32} value={field.width} onChange={(e) => patchField(selected.id, field.id, { width: clamp(+e.target.value, 1, 32) })} style={{ width: 62 }} /></td>
                    <td><input value={field.desc ?? ""} onChange={(e) => patchField(selected.id, field.id, { desc: e.target.value })} style={{ width: "100%" }} /></td>
                    <td><button className="btn" onClick={() => update((old) => ({
                      ...old,
                      registers: old.registers.map((r) => r.id === selected.id ? { ...r, fields: r.fields.filter((f) => f.id !== field.id) } : r),
                    }))}>Del</button></td>
                  </tr>
                ))}
                {!selected.fields.length && <tr><td colSpan={5} className="muted">No fields.</td></tr>}
              </tbody>
            </table>
            <button className="btn" onClick={() => addField(selected.id)}>+ Add field</button>
          </>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="toolbar">
          <button className={`btn${preview === "c" ? " primary" : ""}`} onClick={() => setPreview("c")}>C header</button>
          <button className={`btn${preview === "md" ? " primary" : ""}`} onClick={() => setPreview("md")}>Markdown</button>
        </div>
        <pre className="code" style={{ maxHeight: 360 }}>{preview === "c" ? header : markdown}</pre>
      </div>
    </div>
  );
}

function parseHex(text: string): number {
  const clean = text.trim();
  const n = clean.startsWith("0x") || clean.startsWith("0X") ? parseInt(clean.slice(2), 16) : parseInt(clean, 16);
  return Number.isFinite(n) ? n >>> 0 : 0;
}

function hex(n: number, width: number): string {
  return `0x${(n >>> 0).toString(16).toUpperCase().padStart(width, "0")}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}
