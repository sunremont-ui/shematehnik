import { useEffect, useMemo, useRef, useState } from "react";
import { useUcp } from "../store.ts";
import { MODULE_INDEX } from "../data/modules.ts";
import { PanelHead } from "./common.tsx";
import { appendCapture, capture, clearCapture, packet, type PacketField as Field } from "../design.ts";
import { genPacketStruct } from "../codegen.ts";
import { crc16Ccitt, decodePackets, formatHexBytes, parseHexBytes } from "../decode.ts";
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
  const setFields = (u: Field[] | ((f: Field[]) => Field[])) => {
    packet.update(typeof u === "function" ? (u as (f: Field[]) => Field[]) : () => u);
    ucp.markModified();
  };
  const nid = useRef(Math.max(0, ...fields.map((f) => f.id)) + 1);
  const total = fields.reduce((s, f) => s + f.bytes, 0);
  const bytes = packetBytes(fields);
  const hex = bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0"));
  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className="dot ok" />{total} bytes</span>
        <button className="btn" onClick={() => { appendCapture(bytes); ucp.setStatus(`Sent ${bytes.length} bytes to Analyzer capture`); }}>Send to Analyzer</button>
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
    if (dir === "RX") appendCapture(bytes);
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
  const fields = packet.use();
  const cap = capture.use();
  const sample = useMemo(() => formatHexBytes(packetBytes(fields)), [fields]);
  const [source, setSource] = useState<"capture" | "manual">("manual");
  const [input, setInput] = useState("");
  const bytes = source === "capture" ? cap : parseHexBytes(input || sample);
  const decoded = useMemo(() => decodePackets(bytes, fields), [bytes, fields]);
  const first = decoded.packets[0];
  const fieldAt = new Map<number, number>();
  if (first) {
    let off = first.offset;
    fields.forEach((f, i) => {
      for (let n = 0; n < f.bytes; n++) fieldAt.set(off + n, i);
      off += f.bytes;
    });
  }
  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className={`dot ${decoded.packets.length ? "ok" : "warn"}`} />{decoded.packets.length} packets</span>
        <span className="chip"><span className="dot" />{bytes.length} bytes</span>
        <button className="btn" onClick={() => { clearCapture(); ucp.setStatus("Analyzer capture cleared"); }}>Clear capture</button>
        <button className="btn primary" onClick={() => ucp.setStatus(`Decoded ${decoded.packets.length} packet(s), garbage ${decoded.garbage.length}, remainder ${decoded.remainder.length}`)}>Decode</button>
      </>} />
      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <label className="field">Source
            <select value={source} onChange={(e) => setSource(e.target.value as "capture" | "manual")}>
              <option value="manual">Manual hex</option>
              <option value="capture">UART capture</option>
            </select>
          </label>
          <label className="field">Manual hex
            <textarea rows={4} value={input || sample} onChange={(e) => { setInput(e.target.value); setSource("manual"); }} />
          </label>
          <button className="btn" onClick={() => { setInput(sample); setSource("manual"); }}>Use Packet Editor sample</button>
          <div className="muted">Дескриптор: {fields.map((f) => `${f.name}(${f.bytes})`).join(" ")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {bytes.map((b, i) => {
              const fi = fieldAt.get(i);
              return <span key={i} className="kbd" style={{ background: fi == null ? undefined : FIELD_COLORS[fi % FIELD_COLORS.length], color: fi == null ? undefined : "#0d1117" }}>
                {b.toString(16).toUpperCase().padStart(2, "0")}
              </span>;
            })}
          </div>
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Offset</th><th>CRC</th><th>Fields</th></tr></thead>
            <tbody>
              {decoded.packets.map((p, i) => <tr key={i}>
                <td><code>{p.offset}</code></td>
                <td>{p.crcOk == null ? "—" : p.crcOk ? "OK" : "FAIL"}</td>
                <td>{Object.entries(p.fields).map(([k, v], n) =>
                  <span key={k} className="tag" style={{ marginRight: 4, background: FIELD_COLORS[n % FIELD_COLORS.length], color: "#0d1117" }}>{k}=0x{v.toString(16).toUpperCase()}</span>)}</td>
              </tr>)}
              {!decoded.packets.length && <tr><td colSpan={3} className="muted">Нет полного пакета.</td></tr>}
            </tbody>
          </table>
          {(decoded.garbage.length > 0 || decoded.remainder.length > 0) && (
            <p className="muted" style={{ fontSize: 12 }}>
              garbage: <code>{formatHexBytes(decoded.garbage) || "—"}</code><br />
              remainder: <code>{formatHexBytes(decoded.remainder) || "—"}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const FIELD_COLORS = ["#79c0ff", "#a5d6ff", "#7ee787", "#d2a8ff", "#ffa657", "#ff7b72"];

function packetBytes(fields: Field[]): number[] {
  const out: number[] = [];
  let crcAt = -1;
  fields.forEach((f) => {
    if (/crc/i.test(f.name)) crcAt = out.length;
    for (let i = f.bytes - 1; i >= 0; i--) out.push((f.value >> (i * 8)) & 0xff);
  });
  if (crcAt >= 0) {
    const crc = crc16Ccitt(out.slice(0, crcAt));
    const f = fields.find((x) => /crc/i.test(x.name));
    if (f) for (let i = 0; i < f.bytes; i++) out[crcAt + i] = (crc >> ((f.bytes - 1 - i) * 8)) & 0xff;
  }
  return out;
}
