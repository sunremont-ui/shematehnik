import { useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { uiDesign, type UiW as W } from "../design.ts";
import { genLvgl } from "../codegen.ts";
import { downloadText } from "../util.ts";

const TYPES = ["Button", "Label", "Slider", "Switch", "Arc", "Chart", "Gauge", "Bar", "Panel", "Dropdown", "Checkbox", "Roller", "TextArea", "Image", "NavList"];

export function UiDesignerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["ui"];
  const widgets = uiDesign.use();
  const setWidgets = (u: W[] | ((w: W[]) => W[])) => uiDesign.update(typeof u === "function" ? (u as (w: W[]) => W[]) : () => u);
  const [sel, setSel] = useState<number | null>(1);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(Math.max(0, ...widgets.map((w) => w.id)) + 1);

  function exportC() {
    const { c, h } = genLvgl(widgets, "main");
    downloadText("ui.c", c, "text/x-c");
    downloadText("ui.h", h, "text/x-c");
    ucp.setStatus(`Exported ui.c / ui.h — ${widgets.length} widgets (LVGL)`);
  }

  function add(type: string) {
    const id = nextId.current++;
    setWidgets((w) => [...w, { id, type, x: 40, y: 40, w: type === "Label" ? 120 : 100, h: type === "Slider" ? 20 : 40, text: type }]);
    setSel(id);
    ucp.setStatus(`Added ${type}`); ucp.markModified();
  }
  function down(e: React.PointerEvent, w: W) {
    const r = screenRef.current!.getBoundingClientRect();
    drag.current = { id: w.id, dx: e.clientX - r.left - w.x, dy: e.clientY - r.top - w.y };
    setSel(w.id); (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const r = screenRef.current!.getBoundingClientRect();
    setWidgets((ws) => ws.map((w) => w.id === drag.current!.id
      ? { ...w, x: Math.max(0, e.clientX - r.left - drag.current!.dx), y: Math.max(0, e.clientY - r.top - drag.current!.dy) } : w));
  }
  const selected = widgets.find((w) => w.id === sel) ?? null;

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={exportC}>Export C</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 220px", gap: 12 }}>
        <div className="card" style={{ padding: 8, maxHeight: 460, overflow: "auto" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>WIDGETS</div>
          {TYPES.map((t) => (
            <button key={t} className="btn" style={{ width: "100%", marginBottom: 4, padding: "4px 8px" }} onClick={() => add(t)}>{t}</button>
          ))}
        </div>
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: 18 }}>
          <div ref={screenRef} onPointerMove={move} onPointerUp={() => { if (drag.current) { ucp.markModified(); drag.current = null; } }}
            onClick={(e) => { if (e.target === screenRef.current) setSel(null); }}
            style={{ position: "relative", width: 240, height: 320, background: "#000", border: "6px solid #222", borderRadius: 14 }}>
            {widgets.map((w) => (
              <div key={w.id} onPointerDown={(e) => down(e, w)}
                style={{
                  position: "absolute", left: w.x, top: w.y, width: w.w, height: w.h,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab",
                  fontSize: 12, color: "#e6edf3", userSelect: "none",
                  borderRadius: w.type === "Arc" ? "50%" : 6,
                  border: w.id === sel ? "2px solid var(--accent)" : "1px solid #444",
                  background: w.type === "Button" ? "var(--accent)" : w.type === "Arc" ? "transparent" : "#161b22",
                  boxShadow: w.type === "Arc" ? "inset 0 0 0 4px var(--accent)" : "none",
                }}>
                {w.type === "Arc" ? "60°" : w.text}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>PROPERTIES</div>
          {selected ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="tag">{selected.type}</div>
              <label className="field">Text<input value={selected.text} onChange={(e) => patch(selected.id, { text: e.target.value })} /></label>
              <div style={{ display: "flex", gap: 8 }}>
                <label className="field" style={{ flex: 1 }}>W<input type="number" value={selected.w} onChange={(e) => patch(selected.id, { w: +e.target.value })} /></label>
                <label className="field" style={{ flex: 1 }}>H<input type="number" value={selected.h} onChange={(e) => patch(selected.id, { h: +e.target.value })} /></label>
              </div>
              <button className="btn" onClick={() => { setWidgets((ws) => ws.filter((w) => w.id !== selected.id)); setSel(null); ucp.markModified(); }}>Delete</button>
            </div>
          ) : <p className="muted">Выберите виджет.</p>}
        </div>
      </div>
    </div>
  );
  function patch(id: number, p: Partial<W>) { setWidgets((ws) => ws.map((w) => w.id === id ? { ...w, ...p } : w)); ucp.markModified(); }
}
