import { useEffect, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";

// ============================================================
// Sequence Diagram
// ============================================================
interface Msg { from: number; to: number; label: string; }
export function SequenceView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["sequence"];
  const actors = ["MCU", "Sensor", "Display"];
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 0, to: 1, label: "read_temp()" },
    { from: 1, to: 0, label: "0x1A3F" },
    { from: 0, to: 2, label: "draw(26.1°C)" },
  ]);
  const [from, setFrom] = useState(0), [to, setTo] = useState(1), [label, setLabel] = useState("ack");
  const colX = (i: number) => 80 + i * 160;
  const H = 80 + msgs.length * 46 + 30;

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={() => ucp.setStatus("Sequence exported (PNG)")}>Export PNG</button>} />
      <div className="card" style={{ padding: 0, marginBottom: 12 }}>
        <svg width="100%" height={H} viewBox={`0 0 520 ${H}`} style={{ background: "var(--base)", display: "block" }}>
          {actors.map((a, i) => <g key={a}>
            <rect x={colX(i) - 40} y={16} width={80} height={28} rx={4} fill="var(--raised)" stroke="var(--accent-soft)" />
            <text x={colX(i)} y={34} textAnchor="middle" fill="var(--text)" fontFamily="monospace" fontSize="12">{a}</text>
            <line x1={colX(i)} y1={44} x2={colX(i)} y2={H - 10} stroke="var(--border)" strokeDasharray="4 4" />
          </g>)}
          {msgs.map((m, i) => {
            const y = 80 + i * 46, x1 = colX(m.from), x2 = colX(m.to), dir = x2 > x1 ? 1 : -1;
            return <g key={i}>
              <line x1={x1} y1={y} x2={x2 - dir * 6} y2={y} stroke="var(--accent-soft)" strokeWidth="1.6" markerEnd="url(#arr)" />
              <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" fill="var(--muted)" fontFamily="monospace" fontSize="11">{m.label}</text>
            </g>;
          })}
          <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6Z" fill="var(--accent-soft)" /></marker></defs>
        </svg>
      </div>
      <div className="card toolbar" style={{ margin: 0 }}>
        <select value={from} onChange={(e) => setFrom(+e.target.value)}>{actors.map((a, i) => <option key={a} value={i}>{a}</option>)}</select>
        <span className="muted">→</span>
        <select value={to} onChange={(e) => setTo(+e.target.value)}>{actors.map((a, i) => <option key={a} value={i}>{a}</option>)}</select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="message" />
        <button className="btn primary" onClick={() => { if (from !== to) { setMsgs((m) => [...m, { from, to, label }]); ucp.markModified(); } }}>Add message</button>
      </div>
    </div>
  );
}

// ============================================================
// Packet Editor
// ============================================================
interface Field { id: number; name: string; bytes: number; value: number; }
export function PacketView() {
  const mod = MODULE_INDEX["packet"];
  const [fields, setFields] = useState<Field[]>([
    { id: 1, name: "header", bytes: 1, value: 0xAA },
    { id: 2, name: "cmd", bytes: 1, value: 0x03 },
    { id: 3, name: "length", bytes: 2, value: 0x0004 },
    { id: 4, name: "crc", bytes: 2, value: 0x1A3F },
  ]);
  const nid = useRef(5);
  const total = fields.reduce((s, f) => s + f.bytes, 0);
  const hex = fields.flatMap((f) => {
    const bytes: string[] = [];
    for (let i = f.bytes - 1; i >= 0; i--) bytes.push(((f.value >> (i * 8)) & 0xff).toString(16).toUpperCase().padStart(2, "0"));
    return bytes;
  });
  return (
    <div>
      <PanelHead mod={mod} right={<span className="chip"><span className="dot ok" />{total} bytes</span>} />
      <div className="grid cols2">
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Field</th><th>Bytes</th><th>Value (hex)</th><th></th></tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id}>
                  <td><input style={{ width: "100%" }} value={f.name} onChange={(e) => patch(f.id, { name: e.target.value })} /></td>
                  <td><select value={f.bytes} onChange={(e) => patch(f.id, { bytes: +e.target.value })}>{[1, 2, 4].map((b) => <option key={b}>{b}</option>)}</select></td>
                  <td><input style={{ width: 80 }} value={f.value.toString(16).toUpperCase()} onChange={(e) => patch(f.id, { value: parseInt(e.target.value, 16) || 0 })} /></td>
                  <td><button className="btn" style={{ padding: "2px 8px" }} onClick={() => setFields((fs) => fs.filter((x) => x.id !== f.id))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => setFields((fs) => [...fs, { id: nid.current++, name: "field", bytes: 1, value: 0 }])}>+ Add field</button>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>BYTE STREAM</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hex.map((b, i) => <span key={i} className="kbd" style={{ fontSize: 13 }}>{b}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
  function patch(id: number, p: Partial<Field>) { setFields((fs) => fs.map((x) => x.id === id ? { ...x, ...p } : x)); }
}

// ============================================================
// UART Monitor — симуляция потока
// ============================================================
export function UartView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["uart"];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hex" | "ascii">("hex");
  const [lines, setLines] = useState<string[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function toggle() {
    if (open) { if (timer.current) clearInterval(timer.current); setOpen(false); ucp.setStatus("Port closed"); return; }
    setOpen(true); ucp.setStatus("COM3 @ 115200 opened");
    timer.current = window.setInterval(() => {
      const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
      const ts = new Date().toLocaleTimeString();
      const body = mode === "hex" ? bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")
        : bytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
      setLines((l) => [...l.slice(-200), `[${ts}] RX  ${body}`]);
    }, 600);
  }

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          <select value={mode} onChange={(e) => setMode(e.target.value as "hex" | "ascii")}><option value="hex">HEX</option><option value="ascii">ASCII</option></select>
          <button className="btn" onClick={() => setLines([])}>Clear</button>
          <button className={`btn${open ? "" : " primary"}`} onClick={toggle}>{open ? "Disconnect" : "Connect"}</button>
        </>
      } />
      <div className="card" style={{ padding: 0 }}>
        <pre className="code" style={{ border: "none", height: 360, margin: 0 }}>{lines.length ? lines.join("\n") : "— нет данных, нажмите Connect —"}</pre>
      </div>
    </div>
  );
}

// ============================================================
// Protocol Analyzer — декодер hex по дескриптору
// ============================================================
export function AnalyzerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["analyzer"];
  const [input, setInput] = useState("AA 03 00 04 1A 3F");
  const bytes = (input.match(/[0-9a-fA-F]{2}/g) ?? []).map((h) => parseInt(h, 16));
  const schema = [{ name: "header", n: 1 }, { name: "cmd", n: 1 }, { name: "length", n: 2 }, { name: "crc", n: 2 }];
  let off = 0;
  const decoded = schema.map((f) => {
    const slice = bytes.slice(off, off + f.n); off += f.n;
    const val = slice.reduce((s, b) => (s << 8) | b, 0);
    return { ...f, hex: slice.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" "), val };
  });
  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={() => ucp.setStatus(`Decoded ${bytes.length} bytes`)}>Decode</button>} />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <label className="field">Captured frame (hex)<textarea rows={4} value={input} onChange={(e) => setInput(e.target.value)} /></label>
          <div className="muted">Дескриптор: header(1) cmd(1) length(2) crc(2)</div>
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Field</th><th>Bytes</th><th>Value</th></tr></thead>
            <tbody>{decoded.map((d) => <tr key={d.name}><td>{d.name}</td><td><code>{d.hex || "—"}</code></td><td><code>{d.val} (0x{d.val.toString(16).toUpperCase()})</code></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
