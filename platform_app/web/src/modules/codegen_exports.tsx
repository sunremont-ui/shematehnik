import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX, type ModuleDef } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { uiProject } from "../design.ts";
import { packet } from "../design.ts";
import { genLvgl, genLvglProject, genProtoParser, genBlink } from "../codegen.ts";
import { downloadText } from "../util.ts";

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

// LVGL — настоящий код из экранов UI Designer (общий стор uiProject).
export function LvglExportView() {
  const project = uiProject.use();
  const [file, setFile] = useState<"c" | "h">("c");
  const [mode, setMode] = useState<"project" | "screen">("project");
  const active = project.screens.find((s) => s.id === project.initialScreenId) ?? project.screens[0] ?? { id: "main", widgets: [] };
  const gen = mode === "project" ? genLvglProject(project) : genLvgl(active.widgets, active.id);
  const code = file === "c" ? gen.c : gen.h;
  const widgets = project.screens.reduce((sum, screen) => sum + screen.widgets.length, 0);
  return <CodeShell mod={MODULE_INDEX["lvgl"]} code={code} filename={file === "c" ? "ui.c" : "ui.h"} controls={
    <><span className="muted">File:</span>
      <button className={`btn${file === "c" ? " primary" : ""}`} onClick={() => setFile("c")}>ui.c</button>
      <button className={`btn${file === "h" ? " primary" : ""}`} onClick={() => setFile("h")}>ui.h</button>
      <span className="muted">Mode:</span>
      <button className={`btn${mode === "project" ? " primary" : ""}`} onClick={() => setMode("project")}>Project</button>
      <button className={`btn${mode === "screen" ? " primary" : ""}`} onClick={() => setMode("screen")}>Current screen</button>
      <span className="chip" style={{ marginLeft: "auto" }}><span className="dot ok" />{project.screens.length} screens / {widgets} widgets из UI Designer</span>
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
