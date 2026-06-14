import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX, type ModuleDef } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { uiProject, type UiAsset } from "../design.ts";
import { packet } from "../design.ts";
import { rgbaToRgb565, rgbaToRgb565a8 } from "../image.ts";
import { genLvgl, genLvglProject, genLvglReadme, genProtoParser, genBlink, type LvMode } from "../codegen.ts";
import { downloadText, downloadBlob } from "../util.ts";
import { zipStore } from "../zip.ts";

function CodeShell({ mod, code, filename, controls }: { mod: ModuleDef; code: string; filename: string; controls?: React.ReactNode }) {
  const ucp = useUcp();
  return (
    <div>
      <PanelHead mod={mod} right={<>
        <button className="btn" onClick={() => { downloadText(filename, code, "text/x-c"); ucp.setStatus(`Downloaded ${filename}`); }}>Download</button>
        <button className="btn primary" onClick={() => { navigator.clipboard?.writeText(code); ucp.setStatus(`Copied ${mod.title} output`); }}>Copy</button>
      </>} />
      {controls && <div className="card toolbar" style={{ marginBottom: 12 }}>{controls}</div>}
      <div className="card" style={{ padding: 0 }}>
        <pre className="code" style={{ border: "none", maxHeight: 420, margin: 0 }}>{code}</pre>
      </div>
    </div>
  );
}

// Редактор manifest изображений проекта (id + путь к источнику + инлайн RGB565).
function AssetManifest({ assets }: { assets: UiAsset[] }) {
  const patch = (i: number, p: Partial<UiAsset>) => uiProject.update((proj) => {
    const next = [...(proj.assets ?? [])];
    next[i] = { ...next[i], ...p };
    if (!next[i].src) delete next[i].src;
    return { ...proj, assets: next };
  });
  const add = () => uiProject.update((proj) => ({ ...proj, assets: [...(proj.assets ?? []), { id: "" }] }));
  const remove = (i: number) => uiProject.update((proj) => ({ ...proj, assets: (proj.assets ?? []).filter((_, j) => j !== i) }));
  // Декод картинки через canvas → RGB565(/A8) байты (чистая конвертация в image.ts).
  const importImage = (i: number, file: File | undefined, alpha: boolean) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = alpha ? rgbaToRgb565a8(width, height, data) : rgbaToRgb565(width, height, data);
        patch(i, { ...px, src: assets[i]?.src || file.name });
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };
  return (
    <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <span className="muted">Image assets:</span>
      {assets.map((a, i) => (
        <span key={i} className="chip" style={{ gap: 4 }}>
          <input aria-label="Asset manifest id" placeholder="id" style={{ width: 90 }} value={a.id} onChange={(e) => patch(i, { id: e.target.value })} />
          <input aria-label="Asset manifest src" placeholder="src (path)" style={{ width: 150 }} value={a.src ?? ""} onChange={(e) => patch(i, { src: e.target.value })} />
          <label className="btn" title="Import image as inline RGB565" style={{ cursor: "pointer" }}>img
            <input type="file" accept="image/*" hidden onChange={(e) => importImage(i, e.target.files?.[0], false)} />
          </label>
          <label className="btn" title="Import image as inline RGB565 + alpha" style={{ cursor: "pointer" }}>imgα
            <input type="file" accept="image/*" hidden onChange={(e) => importImage(i, e.target.files?.[0], true)} />
          </label>
          {a.data && <span className="muted">{a.w}×{a.h}{a.format === "rgb565a8" ? "α" : ""}</span>}
          <button className="btn" title="Remove asset" onClick={() => remove(i)}>×</button>
        </span>
      ))}
      <button className="btn" onClick={add}>+ Asset</button>
    </div>
  );
}

// LVGL — настоящий код из экранов UI Designer (общий стор uiProject).
export function LvglExportView() {
  const project = uiProject.use();
  const [file, setFile] = useState<"c" | "h">("c");
  const [mode, setMode] = useState<"project" | "screen">("project");
  const [target, setTarget] = useState<LvMode>("v8");
  const active = project.screens.find((s) => s.id === project.initialScreenId) ?? project.screens[0] ?? { id: "main", widgets: [] };
  const gen = mode === "project" ? genLvglProject(project, target) : genLvgl(active.widgets, active.id, target);
  const code = file === "c" ? gen.c : gen.h;
  const widgets = project.screens.reduce((sum, screen) => sum + screen.widgets.length, 0);
  const downloadZip = () => {
    const proj = genLvglProject(project, target);
    const zip = zipStore([
      { name: "ui.c", data: proj.c },
      { name: "ui.h", data: proj.h },
      { name: "README.txt", data: genLvglReadme(project) },
    ]);
    downloadBlob("ui_lvgl.zip", zip, "application/zip");
  };
  return <CodeShell mod={MODULE_INDEX["lvgl"]} code={code} filename={file === "c" ? "ui.c" : "ui.h"} controls={
    <><span className="muted">File:</span>
      <button className={`btn${file === "c" ? " primary" : ""}`} onClick={() => setFile("c")}>ui.c</button>
      <button className={`btn${file === "h" ? " primary" : ""}`} onClick={() => setFile("h")}>ui.h</button>
      <span className="muted">Mode:</span>
      <button className={`btn${mode === "project" ? " primary" : ""}`} onClick={() => setMode("project")}>Project</button>
      <button className={`btn${mode === "screen" ? " primary" : ""}`} onClick={() => setMode("screen")}>Current screen</button>
      <span className="muted">Target:</span>
      <button className={`btn${target === "v8" ? " primary" : ""}`} onClick={() => setTarget("v8")}>v8</button>
      <button className={`btn${target === "v9" ? " primary" : ""}`} onClick={() => setTarget("v9")}>v9</button>
      <button className="btn" title="Download ui.c + ui.h + README as a .zip" onClick={downloadZip}>Download .zip</button>
      <span className="chip" style={{ marginLeft: "auto" }}><span className="dot ok" />{project.screens.length} screens / {widgets} widgets из UI Designer</span>
      {mode === "project" && <AssetManifest assets={project.assets ?? []} />}
    </>
  } />;
}

// Arduino / ESP-IDF — параметрический blink.
export function ArduinoExportView() {
  const [target, setTarget] = useState<"arduino" | "espidf">("arduino");
  const [pin, setPin] = useState(5);
  const [baud, setBaud] = useState(115200);
  const [delayMs, setDelayMs] = useState(500);
  const code = genBlink({ pin, baud, delayMs, target });
  return <CodeShell mod={MODULE_INDEX["arduino"]} code={code} filename={target === "arduino" ? "sketch.ino" : "main.c"} controls={
    <><span className="muted">Target:</span>
      <button className={`btn${target === "arduino" ? " primary" : ""}`} onClick={() => setTarget("arduino")}>Arduino</button>
      <button className={`btn${target === "espidf" ? " primary" : ""}`} onClick={() => setTarget("espidf")}>ESP-IDF</button>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>LED pin<input type="number" style={{ width: 60 }} value={pin} onChange={(e) => setPin(+e.target.value)} /></label>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>Baud<input type="number" style={{ width: 80 }} value={baud} onChange={(e) => setBaud(+e.target.value)} /></label>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>Delay ms<input type="number" style={{ width: 70 }} value={delayMs} onChange={(e) => setDelayMs(+e.target.value)} /></label>
    </>
  } />;
}

// Protocol Code Gen — парсер из полей Packet Editor (общий стор packet).
export function ProtoCodeGenView() {
  const fields = packet.use();
  const [lang, setLang] = useState<"c" | "py">("c");
  const code = genProtoParser(fields, lang);
  return <CodeShell mod={MODULE_INDEX["protocodegen"]} code={code} filename={lang === "c" ? "frame_parse.c" : "frame_parse.py"} controls={
    <><span className="muted">Language:</span>
      <button className={`btn${lang === "c" ? " primary" : ""}`} onClick={() => setLang("c")}>C</button>
      <button className={`btn${lang === "py" ? " primary" : ""}`} onClick={() => setLang("py")}>Python</button>
      <span className="chip" style={{ marginLeft: "auto" }}><span className="dot ok" />{fields.length} полей из Packet Editor</span>
    </>
  } />;
}
