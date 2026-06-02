import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

type Status = "done" | "wip" | "todo";
interface FwMod { name: string; status: Status; note: string; }
interface FwProj { name: string; mcu: string; mods: FwMod[]; }

const PROJECTS: FwProj[] = [
  {
    name: "Filament Dryer", mcu: "STM32F401CC",
    mods: [
      { name: "display (ILI9341)", status: "done", note: "SPI TFT 320×240, фреймбуфер" },
      { name: "encoder", status: "done", note: "Энкодер EC11 + кнопка, прерывания" },
      { name: "temp (NTC)", status: "done", note: "ADC + таблица термистора 100k" },
      { name: "dht11", status: "wip", note: "Однопроводной датчик влажности" },
      { name: "flash settings", status: "wip", note: "Хранение уставок во flash" },
      { name: "drying FSM", status: "todo", note: "Конечный автомат цикла сушки" },
    ],
  },
  {
    name: "Soldering Iron", mcu: "STM32F401CCU6",
    mods: [
      { name: "display (SSD1306)", status: "done", note: "I2C OLED 128×64" },
      { name: "encoder", status: "done", note: "Установка температуры" },
      { name: "temp", status: "done", note: "Термопара жала + усилитель" },
      { name: "heater (симистор)", status: "wip", note: "Управление нагревателем" },
      { name: "PID regulator", status: "todo", note: "Стабилизация температуры жала" },
    ],
  },
];

const COLOR: Record<Status, string> = { done: "#3fb950", wip: "#d29922", todo: "var(--muted)" };

export function FirmwareProjectView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["firmproj"];
  const [proj, setProj] = useState(0);
  const [sel, setSel] = useState(0);
  const p = PROJECTS[proj];
  const m = p.mods[sel];
  const progress = Math.round(p.mods.filter((x) => x.status === "done").length / p.mods.length * 100);

  return (
    <div>
      <PanelHead mod={mod} right={
        <select value={proj} onChange={(e) => { setProj(+e.target.value); setSel(0); }}>
          {PROJECTS.map((x, i) => <option key={x.name} value={i}>{x.name}</option>)}
        </select>
      } />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>
        <div className="card" style={{ display: "grid", gap: 4, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{p.mcu} · {progress}% done</div>
          <div style={{ height: 6, background: "var(--raised)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)" }} />
          </div>
          {p.mods.map((x, i) => (
            <div key={x.name} className={`tree-row${i === sel ? " active" : ""}`} style={{ borderRadius: 4 }} onClick={() => setSel(i)}>
              <span className="ico"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: COLOR[x.status] }} /></span>
              <span className="lbl">{x.name}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>{m.name}</h3>
            <span className="chip"><span className="dot" style={{ background: COLOR[m.status] }} />{m.status}</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>{m.note}</p>
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn primary" onClick={() => ucp.setStatus(`firmware_project.agent.request → ${p.name}/${m.name}`)}>🦾 Ask agent to implement</button>
            <button className="btn" onClick={() => ucp.setStatus("Opened module sources")}>Open sources</button>
          </div>
          <pre className="code">{`{
  "project": "${p.name}",
  "mcu": "${p.mcu}",
  "module": "${m.name}",
  "status": "${m.status}"
}`}</pre>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Agent Runner
// ============================================================
const LOG_LINES = [
  "$ git worktree add .worktrees/agent-dht11 -b agent/dryer-dht11-1717",
  "Preparing worktree (new branch 'agent/dryer-dht11-1717')",
  "$ claude --print --output-format=stream-json",
  "▸ Reading filament_dryer/dht11.h …",
  "▸ Implementing single-wire DHT11 read protocol",
  "▸ Added dht11_read() with 18ms start pulse + 40-bit decode",
  "▸ Updated CMakeLists.txt",
  "✓ Build OK · 3 files changed (+128 −4)",
];

export function AgentRunnerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["agent"];
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function run() {
    setRunning(true); setShown([]); setDone(false);
    ucp.setStatus("Agent task started (worktree)");
    let i = 0;
    const t = window.setInterval(() => {
      setShown((s) => [...s, LOG_LINES[i]]);
      i++;
      if (i >= LOG_LINES.length) { clearInterval(t); setRunning(false); setDone(true); ucp.setStatus("Agent finished — review diff"); }
    }, 450);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" disabled={running} onClick={run}>{running ? "Running…" : "▶ Run task: implement dht11"}</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div className="card" style={{ padding: 0 }}>
          <div className="muted" style={{ fontSize: 11, padding: "10px 12px 0" }}>stream-json log</div>
          <pre className="code" style={{ border: "none", borderRadius: 0, height: 320, margin: 0 }}>{shown.join("\n") || "—"}</pre>
        </div>
        <div className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="muted" style={{ fontSize: 11 }}>DIFF · dht11.c</div>
          <pre className="code" style={{ fontSize: 11 }}>{`@@ dht11.c @@
+bool dht11_read(dht11_t *d) {
+  gpio_pull_low(d->pin, 18000);
+  gpio_release(d->pin);
+  return dht11_decode(d);
+}`}</pre>
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn primary" disabled={!done} onClick={() => ucp.setStatus("Applied: merged agent/dryer-dht11-1717")}>Apply</button>
            <button className="btn" disabled={!done} onClick={() => ucp.setStatus("Discarded worktree")}>Discard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
