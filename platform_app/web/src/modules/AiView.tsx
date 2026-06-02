import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

export function AiView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["ai"];
  const [prompt, setPrompt] = useState("LED blinker on STM32 with current-limiting resistor");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string>("");

  function generate() {
    setBusy(true); setOut("");
    ucp.setStatus("POST api.anthropic.com/v1/messages (claude-sonnet-4-6)…");
    setTimeout(() => {
      setBusy(false);
      setOut(JSON.stringify({
        components: [
          { ref: "U1", type: "STM32F401", x: 0, y: 0 },
          { ref: "R1", type: "Resistor", value: "330", x: 2, y: 0 },
          { ref: "D1", type: "LED", value: "red", x: 4, y: 0 },
        ],
        wires: [
          { from: { refdes: "U1", pin: "PA5" }, to: { refdes: "R1", pin: "1" } },
          { from: { refdes: "R1", pin: "2" }, to: { refdes: "D1", pin: "A" } },
          { from: { refdes: "D1", pin: "K" }, to: { refdes: "U1", pin: "GND" } },
        ],
      }, null, 2));
      ucp.setStatus("ai.schematic.ready → placed 3 components, 3 wires");
    }, 900);
  }

  return (
    <div>
      <PanelHead mod={mod} />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <label className="field">Describe the circuit
            <textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </label>
          <div className="chip"><span className="dot ok" /> model: claude-sonnet-4-6</div>
          <button className="btn primary" disabled={busy} onClick={generate}>{busy ? "Generating…" : "🤖 Generate schematic"}</button>
          <p className="muted" style={{ fontSize: 12 }}>
            API-ключ берётся из <code>UCP_CLAUDE_KEY</code>. Ответ публикуется в EventBus
            <code> ai.schematic.ready</code> и размещается в Schematic Editor.
          </p>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="muted" style={{ fontSize: 11, padding: "10px 12px 0" }}>response</div>
          <pre className="code" style={{ border: "none", borderRadius: 0, maxHeight: 340 }}>{out || "—"}</pre>
        </div>
      </div>
    </div>
  );
}
