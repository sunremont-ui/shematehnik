import { useEffect, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { packet, type PacketField as Field } from "../design.ts";
import { genPacketStruct } from "../codegen.ts";
import { downloadText } from "../util.ts";
import { useSerial, serialOpen, serialClose, serialWrite, onSerialData, formatBytes } from "../serial.ts";

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
  const svgRef = useRef<SVGSVGElement>(null);
  const colX = (i: number) => 80 + i * 160;
  const H = 80 + msgs.length * 46 + 30;

  function exportPng() {
    const svg = svgRef.current; if (!svg) return;
    // var(--…) не разрешаются в standalone-SVG → инжектим вычисленные значения
    const cs = getComputedStyle(document.documentElement);
    const vars = ["--base", "--raised", "--accent-soft", "--text", "--muted", "--border"];
    const style = `<style>svg{${vars.map((v) => `${v}:${cs.getPropertyValue(v).trim()}`).join(";")}}</style>`;
    const xml = new XMLSerializer().serializeToString(svg).replace(/(<svg[^>]*>)/, `$1${style}`);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 520 * 2; canvas.height = H * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "sequence.png"; a.click();
        URL.revokeObjectURL(url);
        ucp.setStatus("Exported sequence.png");
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<button className="btn primary" onClick={exportPng}>Export PNG</button>} />
      <div className="card" style={{ padding: 0, marginBottom: 12 }}>
        <svg ref={svgRef} width="100%" height={H} viewBox={`0 0 520 ${H}`} style={{ background: "var(--base)", display: "block" }}>
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
// Packet Editor — общий стор пакета (расшарен с Protocol Code Gen)
// ============================================================
export function PacketView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["packet"];
  const fields = packet.use();
  const setFields = (u: Field[] | ((f: Field[]) => Field[])) => packet.update(typeof u === "function" ? (u as (f: Field[]) => Field[]) : () => u);
  const nid = useRef(Math.max(0, ...fields.map((f) => f.id)) + 1);
  const total = fields.reduce((s, f) => s + f.bytes, 0);
  const hex = fields.flatMap((f) => {
    const bytes: string[] = [];
    for (let i = f.bytes - 1; i >= 0; i--) bytes.push(((f.value >> (i * 8)) & 0xff).toString(16).toUpperCase().padStart(2, "0"));
    return bytes;
  });
  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className="dot ok" />{total} bytes</span>
        <button className="btn primary" onClick={() => { downloadText("frame.h", genPacketStruct(fields), "text/x-c"); ucp.setStatus("Exported frame.h (#pragma pack struct)"); }}>Export C struct</button>
      </>} />
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
// UART Monitor — реальный порт через Web Serial (Chrome/Edge) +
// симуляция как явный режим-фолбэк.
// ============================================================
const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export function UartView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["uart"];
  const serial = useSerial();
  const [baud, setBaud] = useState(115200);
  const [sim, setSim] = useState(false);
  const [mode, setMode] = useState<"hex" | "ascii">("hex");
  const [lines, setLines] = useState<string[]>([]);
  const [tx, setTx] = useState("");
  const [crlf, setCrlf] = useState(true);
  const timer = useRef<number | null>(null);

  const append = (dir: "RX" | "TX", bytes: ArrayLike<number>, fmt: "hex" | "ascii") => {
    const ts = new Date().toLocaleTimeString();
    setLines((l) => [...l.slice(-400), `[${ts}] ${dir}  ${formatBytes(bytes, fmt)}`]);
  };

  // Реальный RX: пересоздаём подписку при смене формата (замыкание на mode).
  useEffect(() => onSerialData((chunk) => append("RX", chunk, mode)), [mode]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function connect() {
    try { await serialOpen(baud); ucp.setStatus(`Serial open @ ${baud}`); }
    catch (e) { ucp.setStatus(`Serial: ${e instanceof Error ? e.message : e}`); }
  }
  async function disconnect() { await serialClose(); ucp.setStatus("Port closed"); }

  function toggleSim() {
    if (sim) { if (timer.current) clearInterval(timer.current); setSim(false); ucp.setStatus("Симуляция остановлена"); return; }
    setSim(true); ucp.setStatus("Симуляция RX-потока");
    timer.current = window.setInterval(() => {
      const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
      append("RX", bytes, mode);
    }, 600);
  }

  async function send() {
    if (!tx) return;
    const bytes = new TextEncoder().encode(tx + (crlf ? "\r\n" : ""));
    if (serial.status === "open") {
      try { await serialWrite(bytes); } catch (e) { ucp.setStatus(`TX: ${e instanceof Error ? e.message : e}`); return; }
    }
    append("TX", bytes, mode);
    setTx("");
  }

  const portChip = !serial.supported
    ? <span className="chip" title="нужен Chrome/Edge"><span className="dot" />Web Serial недоступен</span>
    : serial.status === "open"
      ? <span className="chip"><span className="dot ok" />{serial.info} @ {serial.baud}</span>
      : serial.status === "error"
        ? <span className="chip" title={serial.info}><span className="dot warn" />ошибка порта</span>
        : <span className="chip"><span className="dot" />порт закрыт</span>;

  return (
    <div>
      <PanelHead mod={mod} right={
        <>
          {sim && <span className="chip"><span className="dot warn" />симуляция</span>}
          {portChip}
          <select value={baud} onChange={(e) => setBaud(+e.target.value)} disabled={serial.status === "open"}>
            {BAUDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as "hex" | "ascii")}><option value="hex">HEX</option><option value="ascii">ASCII</option></select>
          <button className="btn" onClick={() => setLines([])}>Clear</button>
          <button className="btn" onClick={toggleSim}>{sim ? "Stop sim" : "Simulate"}</button>
          {serial.status === "open"
            ? <button className="btn" onClick={disconnect}>Disconnect</button>
            : <button className="btn primary" disabled={!serial.supported} onClick={connect}>Connect</button>}
        </>
      } />
      <div className="card" style={{ padding: 0 }}>
        <pre className="code" style={{ border: "none", height: 330, margin: 0 }}>{lines.length ? lines.join("\n") : "— нет данных: Connect (реальный порт) или Simulate —"}</pre>
      </div>
      <div className="card toolbar" style={{ marginTop: 12 }}>
        <input style={{ flex: 1 }} value={tx} placeholder="send…" onChange={(e) => setTx(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void send(); }} />
        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={crlf} onChange={(e) => setCrlf(e.target.checked)} />\r\n
        </label>
        <button className="btn primary" onClick={() => void send()} disabled={serial.status !== "open" && !sim}>Send</button>
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
