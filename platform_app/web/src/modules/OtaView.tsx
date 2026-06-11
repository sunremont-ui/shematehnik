import { useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { useSerial, serialClose } from "../serial.ts";

// Реальная прошивка ESP32 через esptool-js (Web Serial). Библиотека
// грузится лениво по клику Flash, чтобы не раздувать основной бандл.
// Без Web Serial (Firefox/Safari) остаётся симуляция.
export function OtaView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["ota"];
  const serial = useSerial();
  const [baud, setBaud] = useState(460800);
  const [addr, setAddr] = useState("0x10000");
  const [fw, setFw] = useState<{ name: string; data: Uint8Array } | null>(null);
  const [chip, setChip] = useState("");
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const timer = useRef<number | null>(null);

  const logLine = (s: string) => setLog((l) => [...l.slice(-300), s]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFw({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) });
    logLine(`Loaded ${f.name} (${f.size} bytes)`);
  }

  async function flashReal() {
    if (!fw) { ucp.setStatus("Выберите .bin-файл прошивки"); return; }
    const address = parseInt(addr, 16);
    if (!Number.isFinite(address)) { ucp.setStatus("Некорректный адрес (hex, напр. 0x10000)"); return; }
    setBusy(true); setPct(0); setChip("");
    try {
      await serialClose(); // не делим порт с UART Monitor/PID
      const { ESPLoader, Transport } = await import("esptool-js");
      const port = await navigator.serial.requestPort();
      const transport = new Transport(port);
      const loader = new ESPLoader({
        transport, baudrate: baud,
        terminal: { clean: () => setLog([]), writeLine: logLine, write: logLine },
      });
      logLine("Connecting (если не выходит — зажмите BOOT на плате)…");
      const chipName = await loader.main();
      setChip(chipName);
      await loader.writeFlash({
        fileArray: [{ data: fw.data, address }],
        flashMode: "keep", flashFreq: "keep", flashSize: "keep",
        eraseAll: false, compress: true,
        reportProgress: (_i, written, total) => setPct(Math.floor((written / total) * 100)),
      });
      await loader.after("hard_reset");
      await transport.disconnect();
      setPct(100);
      ucp.setStatus(`Flash complete ✓ (${chipName})`);
    } catch (e) {
      logLine(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
      ucp.setStatus("Flash failed — см. лог");
    } finally {
      setBusy(false);
    }
  }

  function flashSim() {
    if (busy) return;
    setBusy(true); setPct(0);
    setLog([`esptool --baud ${baud} write_flash ${addr} ${fw?.name ?? "firmware.bin"}`, "Connecting...", "Chip is ESP32-D0WD (revision 1)"]);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) {
        p = 100;
        window.clearInterval(timer.current!);
        setBusy(false);
        setLog((l) => [...l, "Writing at 0x... (100 %)", "Hash of data verified.", "Leaving... Hard resetting via RTS pin."]);
        ucp.setStatus("OTA flash complete ✓ (симуляция)");
      } else if (Math.floor(p) % 20 < 6) {
        setLog((l) => [...l, `Writing at 0x000${Math.floor(p)}... (${Math.floor(p)} %)`]);
      }
      setPct(Math.floor(p));
    }, 320);
  }

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          {!serial.supported && <span className="chip" title="нужен Chrome/Edge"><span className="dot warn" />симуляция (нет Web Serial)</span>}
          {chip && <span className="chip"><span className="dot ok" />{chip}</span>}
          <span className="chip"><span className={`dot ${busy ? "warn" : "ok"}`} />{busy ? "flashing" : "idle"}</span>
        </>
      } />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <label className="field">Firmware (.bin)
            <input type="file" accept=".bin" onChange={(e) => void pickFile(e)} />
          </label>
          <label className="field">Flash address (hex)
            <input value={addr} onChange={(e) => setAddr(e.target.value)} />
          </label>
          <label className="field">Baud rate
            <select value={baud} onChange={(e) => setBaud(+e.target.value)}>
              {[115200, 230400, 460800, 921600].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <div>
            <div style={{ height: 10, background: "var(--raised)", borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .2s" }} />
            </div>
            <div className="muted" style={{ marginTop: 4 }}>{pct}%</div>
          </div>
          <button className="btn primary" disabled={busy} onClick={() => serial.supported ? void flashReal() : flashSim()}>
            {busy ? "Flashing…" : "⚡ Flash firmware"}
          </button>
          {serial.supported && <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            Порт запрашивается при нажатии Flash. Esptool сам переводит плату в bootloader (DTR/RTS); если соединение не устанавливается — зажмите BOOT.
          </p>}
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
