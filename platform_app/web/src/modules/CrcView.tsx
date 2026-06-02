import { useMemo, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

const ALGOS = {
  "CRC-8":       { width: 8,  poly: 0x07,       init: 0x00,       refin: false, refout: false, xorout: 0x00 },
  "CRC-16/CCITT":{ width: 16, poly: 0x1021,     init: 0xFFFF,     refin: false, refout: false, xorout: 0x0000 },
  "CRC-16/MODBUS":{width: 16, poly: 0x8005,     init: 0xFFFF,     refin: true,  refout: true,  xorout: 0x0000 },
  "CRC-32":      { width: 32, poly: 0x04C11DB7, init: 0xFFFFFFFF, refin: true,  refout: true,  xorout: 0xFFFFFFFF },
} as const;

function reflect(v: number, width: number): number {
  let r = 0;
  for (let i = 0; i < width; i++) { r = (r << 1) | (v & 1); v >>>= 1; }
  return r >>> 0;
}

function crc(bytes: number[], a: typeof ALGOS[keyof typeof ALGOS]): number {
  const topbit = 1 << (a.width - 1);
  const mask = a.width === 32 ? 0xFFFFFFFF : (1 << a.width) - 1;
  let reg = a.init >>> 0;
  for (let b of bytes) {
    if (a.refin) b = reflect(b, 8);
    reg = (reg ^ (b << (a.width - 8))) >>> 0;
    for (let i = 0; i < 8; i++) {
      reg = (reg & topbit ? ((reg << 1) ^ a.poly) : (reg << 1)) >>> 0;
      reg &= mask;
    }
  }
  if (a.refout) reg = reflect(reg, a.width);
  return ((reg ^ a.xorout) & mask) >>> 0;
}

export function CrcView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["crc"];
  const [text, setText] = useState("123456789");
  const [mode, setMode] = useState<"ascii" | "hex">("ascii");
  const [algo, setAlgo] = useState<keyof typeof ALGOS>("CRC-32");

  const bytes = useMemo(() => {
    if (mode === "ascii") return [...text].map((ch) => ch.charCodeAt(0) & 0xff);
    return (text.match(/[0-9a-fA-F]{2}/g) ?? []).map((h) => parseInt(h, 16));
  }, [text, mode]);

  const a = ALGOS[algo];
  const result = useMemo(() => crc(bytes, a), [bytes, algo]);
  const hex = result.toString(16).toUpperCase().padStart(a.width / 4, "0");

  return (
    <div>
      <PanelHead mod={mod} right={
        <button className="btn primary" onClick={() => { navigator.clipboard?.writeText("0x" + hex); ucp.setStatus(`Copied 0x${hex}`); }}>
          Copy 0x{hex}
        </button>
      } />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div className="toolbar" style={{ margin: 0 }}>
            <select value={algo} onChange={(e) => setAlgo(e.target.value as keyof typeof ALGOS)}>
              {Object.keys(ALGOS).map((k) => <option key={k}>{k}</option>)}
            </select>
            <select value={mode} onChange={(e) => setMode(e.target.value as "ascii" | "hex")}>
              <option value="ascii">ASCII</option>
              <option value="hex">HEX</option>
            </select>
          </div>
          <label className="field">Input ({bytes.length} bytes)
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span className="muted">Result:</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--accent-soft)" }}>0x{hex}</span>
            <span className="muted">({result})</span>
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>PARAMETERS</div>
          <table className="tbl">
            <tbody>
              <tr><td>Width</td><td><code>{a.width}</code></td></tr>
              <tr><td>Polynomial</td><td><code>0x{a.poly.toString(16).toUpperCase()}</code></td></tr>
              <tr><td>Init</td><td><code>0x{(a.init >>> 0).toString(16).toUpperCase()}</code></td></tr>
              <tr><td>RefIn / RefOut</td><td><code>{String(a.refin)} / {String(a.refout)}</code></td></tr>
              <tr><td>XorOut</td><td><code>0x{(a.xorout >>> 0).toString(16).toUpperCase()}</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
