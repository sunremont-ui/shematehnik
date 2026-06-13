import { useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { demoAiSchematic, placeAiResult, requestAiSchematic } from "../ai.ts";
import { getLibraryParts } from "../data/library.ts";
import { PanelHead } from "./common.tsx";

const LS_KEY = "ucp.claudeKey";

export function AiView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["ai"];
  const [prompt, setPrompt] = useState("LED blinker on STM32 with current-limiting resistor");
  const [key, setKey] = useState(() => localStorage.getItem(LS_KEY) || "");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string>("");

  async function generate() {
    setBusy(true); setOut("");
    try {
      const parts = getLibraryParts(ucp.userParts);
      const result = key.trim()
        ? await requestAiSchematic(key.trim(), prompt, parts)
        : demoAiSchematic();
      const placed = placeAiResult(ucp.project, result);
      ucp.addItems(placed);
      ucp.select("schematic");
      setOut(JSON.stringify(result, null, 2));
      ucp.setStatus(`${key.trim() ? "ai.schematic.ready" : "demo schematic"} → placed ${placed.components.length} components, ${placed.wires.length} wires`);
    } catch (e) {
      setOut(String(e instanceof Error ? e.message : e));
      ucp.setStatus("AI Schematic failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PanelHead mod={mod} />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <label className="field">Claude API key
            <input type="password" value={key} placeholder="sk-ant-…" onChange={(e) => {
              setKey(e.target.value);
              localStorage.setItem(LS_KEY, e.target.value);
            }} />
          </label>
          <label className="field">Describe the circuit
            <textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </label>
          <div className="chip"><span className={`dot ${key.trim() ? "ok" : "warn"}`} />{key.trim() ? "model: claude-opus-4-8" : "demo (нет ключа)"}</div>
          <button className="btn primary" disabled={busy} onClick={() => void generate()}>{busy ? "Generating…" : "Generate schematic"}</button>
          <p className="muted" style={{ fontSize: 12 }}>
            Ключ хранится локально в браузере (<code>localStorage</code>). Без ключа используется demo-ответ;
            с ключом запрос идёт напрямую в Anthropic API с browser-access header.
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
