import { useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

export function OtaView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["ota"];
  const [port, setPort] = useState("COM3");
  const [baud, setBaud] = useState("460800");
  const [file, setFile] = useState("firmware.bin");
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const timer = useRef<number | null>(null);

  function flash() {
    if (busy) return;
    setBusy(true); setPct(0);
    setLog([`esptool --port ${port} --baud ${baud} write_flash 0x10000 ${file}`, "Connecting...", "Chip is ESP32-D0WD (revision 1)"]);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) {
        p = 100;
        window.clearInterval(timer.current!);
        setBusy(false);
        setLog((l) => [...l, "Writing at 0x... (100 %)", "Hash of data verified.", "Leaving... Hard resetting via RTS pin."]);
        ucp.setStatus("OTA flash complete ✓");
      } else if (Math.floor(p) % 20 < 6) {
        setLog((l) => [...l, `Writing at 0x000${Math.floor(p)}... (${Math.floor(p)} %)`]);
      }
      setPct(Math.floor(p));
    }, 320);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<span className="chip"><span className={`dot ${busy ? "warn" : "ok"}`} />{busy ? "flashing" : "idle"}</span>} />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <label className="field">Serial port
            <select value={port} onChange={(e) => setPort(e.target.value)}>
              {["COM3", "COM4", "COM7", "/dev/ttyUSB0"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="field">Baud rate
            <select value={baud} onChange={(e) => setBaud(e.target.value)}>
              {["115200", "230400", "460800", "921600"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="field">Firmware file
            <input value={file} onChange={(e) => setFile(e.target.value)} />
          </label>
          <div>
            <div style={{ height: 10, background: "var(--raised)", borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .2s" }} />
            </div>
            <div className="muted" style={{ marginTop: 4 }}>{pct}%</div>
          </div>
          <button className="btn primary" disabled={busy} onClick={flash}>{busy ? "Flashing…" : "⚡ Flash firmware"}</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="muted" style={{ fontSize: 11, padding: "10px 12px 0" }}>esptool log</div>
          <pre className="code" style={{ border: "none", borderRadius: 0, maxHeight: 320 }}>
            {log.length ? log.join("\n") : "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}
