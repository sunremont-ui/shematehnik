import { useEffect, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { UI_EVENT_ACTION_KINDS, UI_EVENT_CODES, UI_FLEX_ALIGNS, UI_LAYOUT_KINDS, UI_STYLE_SWATCHES, UI_TEXT_ALIGNS, uiProject, type UiEventActionKind, type UiEventCode, type UiFlexAlign, type UiLayout, type UiLayoutKind, type UiProjectDesign, type UiScreenDesign, type UiTextAlign, type UiW as W } from "../design.ts";
import { genLvglProject } from "../codegen.ts";
import { downloadText } from "../util.ts";

const TYPES = ["Button", "Label", "Slider", "Switch", "Arc", "Chart", "Gauge", "Bar", "Panel", "Dropdown", "Checkbox", "Roller", "TextArea", "Image", "NavList"];

export function UiDesignerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["ui"];
  const project = uiProject.use();
  const [screenId, setScreenId] = useState(project.initialScreenId ?? project.screens[0]?.id ?? "main");
  const screen = project.screens.find((s) => s.id === screenId) ?? project.screens[0] ?? { id: "main", widgets: [] };
  const widgets = screen.widgets;
  const setWidgets = (u: W[] | ((w: W[]) => W[])) => {
    uiProject.update((p) => updateScreenWidgets(p, screen.id, typeof u === "function" ? (u as (w: W[]) => W[])(widgets) : u));
  };
  const [sel, setSel] = useState<number | null>(1);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project.screens.some((s) => s.id === screenId)) setScreenId(project.initialScreenId ?? project.screens[0]?.id ?? "main");
  }, [project, screenId]);

  function exportC() {
    const { c, h } = genLvglProject(project);
    downloadText("ui.c", c, "text/x-c");
    downloadText("ui.h", h, "text/x-c");
    ucp.setStatus(`Exported ui.c / ui.h — ${project.screens.length} screens (LVGL)`);
  }

  function add(type: string) {
    const id = Math.max(0, ...widgets.map((w) => w.id)) + 1;
    setWidgets((w) => [...w, { id, type, x: 40, y: 40, w: type === "Label" ? 120 : 100, h: type === "Slider" ? 20 : 40, text: type }]);
    setSel(id);
    ucp.setStatus(`Added ${type}`); ucp.markModified();
  }

  function addScreen() {
    const used = new Set(project.screens.map((s) => s.id));
    let n = project.screens.length + 1;
    let id = `screen_${n}`;
    while (used.has(id)) id = `screen_${++n}`;
    uiProject.update((p) => ({
      ...p,
      initialScreenId: p.initialScreenId ?? p.screens[0]?.id ?? id,
      screens: [...p.screens, { id, title: `Screen ${n}`, widgets: [] }],
    }));
    setScreenId(id);
    setSel(null);
    ucp.setStatus(`Added ${id}`); ucp.markModified();
  }

  function removeScreen(id: string) {
    if (project.screens.length <= 1) return;
    const rest = project.screens.filter((s) => s.id !== id);
    const nextId = project.initialScreenId === id ? rest[0].id : project.initialScreenId;
    uiProject.update((p) => ({ ...p, screens: rest, initialScreenId: nextId }));
    setScreenId(nextId ?? rest[0].id);
    setSel(null);
    ucp.setStatus(`Removed ${id}`); ucp.markModified();
  }

  function makeInitial(id: string) {
    uiProject.update((p) => ({ ...p, initialScreenId: id }));
    ucp.setStatus(`Initial screen: ${id}`); ucp.markModified();
  }
  function down(e: React.PointerEvent, w: W) {
    const r = screenRef.current!.getBoundingClientRect();
    const pos = widgetScreenPos(w, widgets);
    drag.current = { id: w.id, dx: e.clientX - r.left - pos.x, dy: e.clientY - r.top - pos.y };
    setSel(w.id); (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const currentDrag = drag.current;
    if (!currentDrag) return;
    const r = screenRef.current!.getBoundingClientRect();
    const nextX = e.clientX - r.left - currentDrag.dx;
    const nextY = e.clientY - r.top - currentDrag.dy;
    setWidgets((ws) => ws.map((w) => {
      if (w.id !== currentDrag.id) return w;
      const parent = panelParent(w, ws);
      return {
        ...w,
        x: Math.max(0, Math.round(nextX - (parent?.x ?? 0))),
        y: Math.max(0, Math.round(nextY - (parent?.y ?? 0))),
      };
    }));
  }
  const selected = widgets.find((w) => w.id === sel) ?? null;
  const parentPanelOptions = selected?.type === "Panel" ? [] : widgets.filter((w) => w.type === "Panel" && w.id !== selected?.id);
  const visualWidgets = [...widgets].sort((a, b) => Number(a.type !== "Panel") - Number(b.type !== "Panel"));

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={exportC}>Export C</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 220px", gap: 12 }}>
        <div className="card" style={{ padding: 8, maxHeight: 460, overflow: "auto" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>SCREENS</div>
          {project.screens.map((s) => (
            <button key={s.id} className={`btn${s.id === screen.id ? " primary" : ""}`} style={{ width: "100%", marginBottom: 4, padding: "4px 8px" }}
              onClick={() => { setScreenId(s.id); setSel(null); }}>
              {s.id === project.initialScreenId ? "* " : ""}{s.title ?? s.id}
            </button>
          ))}
          <button className="btn" style={{ width: "100%", marginBottom: 10, padding: "4px 8px" }} onClick={addScreen}>+ Screen</button>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>WIDGETS</div>
          {TYPES.map((t) => (
            <button key={t} className="btn" style={{ width: "100%", marginBottom: 4, padding: "4px 8px" }} onClick={() => add(t)}>{t}</button>
          ))}
        </div>
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: 18 }}>
          <div ref={screenRef} onPointerMove={move} onPointerUp={() => { if (drag.current) { ucp.markModified(); drag.current = null; } }}
            onClick={(e) => { if (e.target === screenRef.current) setSel(null); }}
            style={{ position: "relative", width: 240, height: 320, background: "#000", border: "6px solid #222", borderRadius: 14 }}>
            {visualWidgets.map((w) => {
              const pos = widgetScreenPos(w, widgets);
              return (
              <div key={w.id} onPointerDown={(e) => down(e, w)}
                style={{
                  position: "absolute", left: pos.x, top: pos.y, width: w.w, height: w.h,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab",
                  fontSize: 12, color: "#e6edf3", userSelect: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px",
                  borderRadius: w.style?.radius ?? (w.type === "Arc" ? "50%" : 6),
                  border: w.id === sel ? "2px solid var(--accent)" : "1px solid #444",
                  background: w.style?.bgColor ?? (w.type === "Button" ? "var(--accent)" : w.type === "Arc" ? "transparent" : "#161b22"),
                  boxShadow: w.type === "Arc" ? "inset 0 0 0 4px var(--accent)" : "none",
                }}>
                {w.type === "Arc" ? "60°" : w.type === "Image" ? (w.assetId ? `img:${w.assetId}` : "Image") : w.text}
              </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>PROPERTIES</div>
          {selected ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="tag">{selected.type}</div>
              <label className="field">Text<input value={selected.text} onChange={(e) => patch(selected.id, { text: e.target.value })} /></label>
              <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={!!selected.hidden} onChange={(e) => patch(selected.id, { hidden: e.target.checked || undefined })} />Hidden
              </label>
              <label className="field">Opacity
                <input type="range" min={0} max={255} value={selected.opa ?? 255}
                  onChange={(e) => patch(selected.id, { opa: +e.target.value >= 255 ? undefined : +e.target.value })} />
              </label>
              {selected.type === "Image" && (
                <label className="field">Asset id
                  <input value={selected.assetId ?? ""} placeholder="img_logo" onChange={(e) => setAssetId(selected, e.target.value)} />
                </label>
              )}
              {selected.type !== "Panel" && (
                <label className="field">Parent panel
                  <select value={selected.parentId ?? ""} onChange={(e) => setParent(selected, e.target.value)}>
                    <option value="">Screen</option>
                    {parentPanelOptions.map((panel) => <option key={panel.id} value={panel.id}>{panel.text || `Panel #${panel.id}`}</option>)}
                  </select>
                </label>
              )}
              {selected.type !== "Panel" && selected.parentId !== undefined && (
                <label className="field">Grow
                  <input type="number" min={0} value={selected.flexGrow ?? 0}
                    onChange={(e) => patch(selected.id, { flexGrow: +e.target.value >= 1 ? Math.round(+e.target.value) : undefined })} />
                </label>
              )}
              {selected.type === "Panel" && (
                <>
                  <label className="field">Layout
                    <select value={selected.layout?.kind ?? ""} onChange={(e) => updateLayout(selected, { kind: e.target.value as UiLayoutKind | "" })}>
                      <option value="">None</option>
                      {UI_LAYOUT_KINDS.map((kind) => <option key={kind} value={kind}>{layoutLabel(kind)}</option>)}
                    </select>
                  </label>
                  <label className="field">Gap
                    <input type="number" min={0} value={selected.layout?.gap ?? 0} disabled={!selected.layout}
                      onChange={(e) => updateLayout(selected, { gap: +e.target.value })} />
                  </label>
                  {(["align", "crossAlign", "trackAlign"] as const).map((field) => (
                    <label key={field} className="field">{alignFieldLabel(field)}
                      <select value={selected.layout?.[field] ?? ""} disabled={!selected.layout}
                        onChange={(e) => updateLayout(selected, { [field]: (e.target.value || undefined) as UiFlexAlign | undefined })}>
                        <option value="">Default</option>
                        {UI_FLEX_ALIGNS.map((align) => <option key={align} value={align}>{flexAlignLabel(align)}</option>)}
                      </select>
                    </label>
                  ))}
                </>
              )}
              <label className="field">Fill
                <input type="color" value={selected.style?.bgColor ?? "#1f6feb"} onChange={(e) => setStyle(selected, { bgColor: e.target.value })} />
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {UI_STYLE_SWATCHES.map((color) => (
                  <button
                    key={color}
                    aria-label={`Swatch ${color}`}
                    title={color}
                    onClick={() => setStyle(selected, { bgColor: color })}
                    style={{ width: 24, height: 24, borderRadius: 6, border: selected.style?.bgColor === color ? "2px solid var(--accent)" : "1px solid #444", background: color, padding: 0 }}
                  />
                ))}
              </div>
              <label className="field">Radius
                <input type="number" min={0} value={selected.style?.radius ?? 0} onChange={(e) => setStyle(selected, { radius: +e.target.value })} />
              </label>
              <label className="field">Text color
                <input type="color" value={selected.style?.textColor ?? "#ffffff"} onChange={(e) => setStyle(selected, { textColor: e.target.value })} />
              </label>
              <label className="field">Text align
                <select value={selected.style?.textAlign ?? ""} onChange={(e) => setStyle(selected, { textAlign: (e.target.value || undefined) as UiTextAlign | undefined })}>
                  <option value="">Default</option>
                  {UI_TEXT_ALIGNS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="field">Border
                <input type="number" min={0} value={selected.style?.borderWidth ?? 0} onChange={(e) => setStyle(selected, { borderWidth: +e.target.value >= 1 ? Math.round(+e.target.value) : undefined })} />
              </label>
              <label className="field">Border color
                <input type="color" value={selected.style?.borderColor ?? "#ffffff"} onChange={(e) => setStyle(selected, { borderColor: e.target.value })} />
              </label>
              <label className="field">Padding
                <input type="number" min={0} value={selected.style?.pad ?? 0} onChange={(e) => setStyle(selected, { pad: +e.target.value >= 1 ? Math.round(+e.target.value) : undefined })} />
              </label>
              <button className="btn" disabled={!selected.style} onClick={() => patch(selected.id, { style: undefined })}>Clear style</button>
              <label className="field">Event
                <select value={selected.event?.code ?? ""} onChange={(e) => setEvent(selected, e.target.value as UiEventCode | "")}>
                  <option value="">None</option>
                  {UI_EVENT_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <label className="field">Handler
                <input
                  value={selected.event?.handler ?? ""}
                  disabled={!selected.event}
                  onChange={(e) => selected.event && patch(selected.id, { event: { ...selected.event, handler: e.target.value } })}
                  placeholder={suggestEventHandler(screen.id, selected)}
                />
              </label>
              <label className="field">Action
                <select
                  value={selected.event?.action?.kind ?? ""}
                  disabled={!selected.event}
                  onChange={(e) => selected.event && setEventAction(selected, e.target.value as UiEventActionKind | "")}
                >
                  <option value="">None</option>
                  {UI_EVENT_ACTION_KINDS.map((kind) => <option key={kind} value={kind}>{eventActionLabel(kind)}</option>)}
                </select>
              </label>
              {selected.event?.action?.kind === "screen_load" && (
                <label className="field">Target screen
                  <select
                    value={selected.event.action.targetScreenId}
                    onChange={(e) => setEventAction(selected, "screen_load", e.target.value)}
                  >
                    {project.screens.map((s) => <option key={s.id} value={s.id}>{s.title ?? s.id}</option>)}
                  </select>
                </label>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <label className="field" style={{ flex: 1 }}>W<input type="number" value={selected.w} onChange={(e) => patch(selected.id, { w: +e.target.value })} /></label>
                <label className="field" style={{ flex: 1 }}>H<input type="number" value={selected.h} onChange={(e) => patch(selected.id, { h: +e.target.value })} /></label>
              </div>
              <button className="btn" onClick={() => { setWidgets((ws) => ws.filter((w) => w.id !== selected.id)); setSel(null); ucp.markModified(); }}>Delete</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="tag">{screen.title ?? screen.id}</div>
              <label className="field">Screen id<input value={screen.id} disabled /></label>
              <button className="btn" disabled={screen.id === project.initialScreenId} onClick={() => makeInitial(screen.id)}>Set initial</button>
              <button className="btn" disabled={project.screens.length <= 1} onClick={() => removeScreen(screen.id)}>Delete screen</button>
              <p className="muted" style={{ margin: 0 }}>Выберите виджет.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  function patch(id: number, p: Partial<W>) { setWidgets((ws) => ws.map((w) => w.id === id ? { ...w, ...p } : w)); ucp.markModified(); }
  function setStyle(w: W, style: NonNullable<W["style"]>) {
    patch(w.id, { style: { ...(w.style ?? {}), ...style, ...(style.radius !== undefined ? { radius: Math.max(0, Math.round(style.radius)) } : {}) } });
  }
  function setEvent(w: W, code: UiEventCode | "") {
    patch(w.id, code ? { event: { code, handler: w.event?.handler || suggestEventHandler(screen.id, w), ...(w.event?.action ? { action: w.event.action } : {}) } } : { event: undefined });
  }
  function setEventAction(w: W, kind: UiEventActionKind | "", targetScreenId = w.event?.action?.targetScreenId ?? defaultTargetScreen(project, screen.id)) {
    if (!w.event) return;
    patch(w.id, kind ? { event: { ...w.event, action: { kind, targetScreenId } } } : { event: { code: w.event.code, handler: w.event.handler } });
  }
  function setAssetId(w: W, raw: string) {
    const assetId = raw.trim();
    patch(w.id, { assetId: assetId || undefined });
  }
  function updateLayout(w: W, changes: { kind?: UiLayoutKind | ""; gap?: number; align?: UiFlexAlign; crossAlign?: UiFlexAlign; trackAlign?: UiFlexAlign }) {
    const kind = "kind" in changes ? changes.kind : w.layout?.kind;
    if (!kind) { patch(w.id, { layout: undefined }); return; }
    const base = w.layout ?? { kind };
    const next: UiLayout = { ...base, kind };
    if ("gap" in changes) next.gap = Math.max(0, Math.round(changes.gap ?? 0));
    for (const field of ["align", "crossAlign", "trackAlign"] as const) {
      if (!(field in changes)) continue;
      if (changes[field]) next[field] = changes[field];
      else delete next[field];
    }
    patch(w.id, { layout: next });
  }
  function setParent(w: W, raw: string) {
    const parentId = Number(raw);
    const parent = widgets.find((candidate) => candidate.id === parentId && candidate.type === "Panel" && candidate.id !== w.id);
    patch(w.id, { parentId: parent ? parent.id : undefined });
  }
}

function updateScreenWidgets(project: UiProjectDesign, screenId: string, widgets: W[]): UiProjectDesign {
  const screens: UiScreenDesign[] = project.screens.length ? project.screens : [{ id: screenId, widgets: [] }];
  return {
    ...project,
    initialScreenId: project.initialScreenId ?? screens[0].id,
    screens: screens.map((screen) => screen.id === screenId ? { ...screen, widgets } : screen),
  };
}

function panelParent(w: W, widgets: W[]): W | null {
  if (w.type === "Panel" || typeof w.parentId !== "number") return null;
  return widgets.find((candidate) => candidate.id === w.parentId && candidate.type === "Panel") ?? null;
}

function widgetScreenPos(w: W, widgets: W[]): { x: number; y: number } {
  const parent = panelParent(w, widgets);
  return { x: w.x + (parent?.x ?? 0), y: w.y + (parent?.y ?? 0) };
}

function suggestEventHandler(screenId: string, w: W): string {
  return `on_${screenId}_${w.type}_${w.id}`;
}

function alignFieldLabel(field: "align" | "crossAlign" | "trackAlign"): string {
  return field === "align" ? "Align" : field === "crossAlign" ? "Cross" : "Track";
}

function flexAlignLabel(align: UiFlexAlign): string {
  return align === "space_between" ? "Space between"
    : align === "space_around" ? "Space around"
    : align === "space_evenly" ? "Space evenly"
    : align.charAt(0).toUpperCase() + align.slice(1);
}

function layoutLabel(kind: UiLayoutKind): string {
  return kind === "flex_row" ? "Flex row" : "Flex column";
}

function eventActionLabel(kind: UiEventActionKind): string {
  return kind === "screen_load" ? "Load screen" : kind;
}

function defaultTargetScreen(project: UiProjectDesign, currentScreenId: string): string {
  return project.screens.find((s) => s.id !== currentScreenId)?.id ?? project.screens[0]?.id ?? currentScreenId;
}
