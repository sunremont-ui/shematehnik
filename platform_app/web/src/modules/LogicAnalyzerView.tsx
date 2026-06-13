import { useEffect, useMemo, useRef, useState } from "react";
import { MODULE_INDEX } from "../data/modules.ts";
import { useUcp } from "../store.ts";
import { downloadText } from "../util.ts";
import { PanelHead } from "./common.tsx";
import {
  captureDuration, decodeI2c, decodeSpi, decodeUart, findChannel, formatSeconds,
  parseLogicText, sampleValue,
  type LogicAnnotation, type LogicCapture,
} from "../logic.ts";

type Protocol = "UART" | "I2C" | "SPI";

const SAMPLE_UART = `time,rx
0us,1
104.167us,0
208.333us,1
312.500us,0
416.667us,1
520.833us,0
625.000us,1
729.167us,0
833.333us,1
937.500us,0
1041.667us,1
1250.000us,1
`;

const SAMPLE_I2C = `time,sda,scl
0us,1,1
1us,0,1
2us,0,0
3us,1,0
4us,1,1
5us,1,0
6us,0,0
7us,0,1
8us,0,0
9us,1,0
10us,1,1
11us,1,0
12us,0,0
13us,0,1
14us,0,0
15us,0,0
16us,0,1
17us,0,0
18us,0,0
19us,0,1
20us,0,0
21us,0,0
22us,0,1
23us,0,0
24us,0,0
25us,0,1
26us,0,0
27us,0,0
28us,0,1
29us,0,0
30us,0,0
31us,0,1
32us,0,0
33us,0,0
34us,0,1
35us,0,0
36us,0,0
37us,1,1
`;

const SAMPLE_SPI = `time,cs,sck,mosi,miso
0us,1,0,0,0
1us,0,0,1,0
2us,0,1,1,0
3us,0,0,0,1
4us,0,1,0,1
5us,0,0,1,0
6us,0,1,1,0
7us,0,0,0,1
8us,0,1,0,1
9us,0,0,0,1
10us,0,1,0,1
11us,0,0,1,0
12us,0,1,1,0
13us,0,0,0,1
14us,0,1,0,1
15us,0,0,1,0
16us,0,1,1,0
17us,1,0,1,0
`;

export function LogicAnalyzerView() {
  const ucp = useUcp();
  const mod = MODULE_INDEX["logic"];
  const [format, setFormat] = useState<"csv" | "vcd">("csv");
  const [raw, setRaw] = useState(SAMPLE_UART);
  const [protocol, setProtocol] = useState<Protocol>("UART");
  const [baud, setBaud] = useState(9600);
  const [uartChannel, setUartChannel] = useState("rx");
  const [sdaName, setSdaName] = useState("sda");
  const [sclName, setSclName] = useState("scl");
  const [mosiName, setMosiName] = useState("mosi");
  const [misoName, setMisoName] = useState("miso");
  const [sckName, setSckName] = useState("sck");
  const [csName, setCsName] = useState("cs");
  const [spiMode, setSpiMode] = useState<0 | 1 | 2 | 3>(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [cursorA, setCursorA] = useState(0);
  const [cursorB, setCursorB] = useState(1e-3);

  const parsed = useMemo(() => {
    try { return { capture: parseLogicText(raw, format), error: "" }; }
    catch (e) { return { capture: null, error: e instanceof Error ? e.message : String(e) }; }
  }, [format, raw]);
  const capture = parsed.capture;
  const duration = capture ? captureDuration(capture) : 1e-3;
  const names = capture?.channels.map((ch) => ch.name) ?? [];
  const annotations = useMemo(() => decodeSelected(capture, protocol, {
    baud, uartChannel, sdaName, sclName, mosiName, misoName, sckName, csName, spiMode,
  }), [baud, capture, csName, misoName, mosiName, protocol, sclName, sckName, sdaName, spiMode, uartChannel]);
  const step = Math.max(duration / 1000, 1e-9);
  const a = Math.min(cursorA, duration);
  const b = Math.min(cursorB, duration);

  async function loadFile(file: File) {
    const text = await file.text();
    const nextFormat = /\.vcd$/i.test(file.name) ? "vcd" : "csv";
    setFormat(nextFormat);
    setRaw(text);
    setPan(0);
    setZoom(1);
    ucp.setStatus(`Logic import: ${file.name}`);
  }

  function useSample(kind: Protocol) {
    setProtocol(kind);
    setFormat("csv");
    setRaw(kind === "UART" ? SAMPLE_UART : kind === "I2C" ? SAMPLE_I2C : SAMPLE_SPI);
    setPan(0);
    setZoom(1);
    if (kind === "UART") setUartChannel("rx");
    if (kind === "I2C") { setSdaName("sda"); setSclName("scl"); }
    if (kind === "SPI") { setCsName("cs"); setSckName("sck"); setMosiName("mosi"); setMisoName("miso"); }
  }

  function exportAnnotations() {
    const csv = ["protocol,start_s,end_s,label,valid,data",
      ...annotations.map((x) => [
        x.protocol, x.start, x.end, quote(x.label), x.valid ?? "", quote(JSON.stringify(x.data ?? {})),
      ].join(",")),
    ].join("\n");
    downloadText("logic-annotations.csv", csv, "text/csv");
    ucp.setStatus(`Exported ${annotations.length} logic annotations`);
  }

  return (
    <div>
      <PanelHead mod={mod} right={<>
        <span className="chip"><span className={`dot ${parsed.error ? "warn" : "ok"}`} />{parsed.error ? "parse error" : `${names.length} channels`}</span>
        <span className="chip"><span className="dot" />{annotations.length} annotations</span>
        <button className="btn" onClick={exportAnnotations} disabled={!annotations.length}>Export CSV</button>
      </>} />

      <div className="card toolbar">
        <select value={format} onChange={(e) => setFormat(e.target.value as "csv" | "vcd")}>
          <option value="csv">CSV</option>
          <option value="vcd">VCD</option>
        </select>
        <select value={protocol} onChange={(e) => setProtocol(e.target.value as Protocol)}>
          <option value="UART">UART</option>
          <option value="I2C">I2C</option>
          <option value="SPI">SPI</option>
        </select>
        <button className="btn" onClick={() => useSample("UART")}>UART sample</button>
        <button className="btn" onClick={() => useSample("I2C")}>I2C sample</button>
        <button className="btn" onClick={() => useSample("SPI")}>SPI sample</button>
        <label className="btn" style={{ cursor: "pointer" }}>
          Import
          <input
            type="file"
            accept=".csv,.vcd,text/csv,text/plain"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ""; }}
          />
        </label>
      </div>

      <div className="grid cols2">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <ProtocolControls
            protocol={protocol}
            names={names}
            baud={baud}
            setBaud={setBaud}
            uartChannel={uartChannel}
            setUartChannel={setUartChannel}
            sdaName={sdaName}
            setSdaName={setSdaName}
            sclName={sclName}
            setSclName={setSclName}
            mosiName={mosiName}
            setMosiName={setMosiName}
            misoName={misoName}
            setMisoName={setMisoName}
            sckName={sckName}
            setSckName={setSckName}
            csName={csName}
            setCsName={setCsName}
            spiMode={spiMode}
            setSpiMode={setSpiMode}
          />
          <div className="grid cols2">
            <label className="field">Zoom
              <input type="range" min={1} max={20} step={0.25} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
            </label>
            <label className="field">Pan
              <input type="range" min={0} max={1} step={0.01} value={pan} onChange={(e) => setPan(+e.target.value)} />
            </label>
            <label className="field">Cursor A
              <input type="range" min={0} max={duration} step={step} value={a} onChange={(e) => setCursorA(+e.target.value)} />
            </label>
            <label className="field">Cursor B
              <input type="range" min={0} max={duration} step={step} value={b} onChange={(e) => setCursorB(+e.target.value)} />
            </label>
          </div>
          <div className="toolbar" style={{ margin: 0 }}>
            <span className="chip"><span className="dot" />A {formatSeconds(a)}</span>
            <span className="chip"><span className="dot" />B {formatSeconds(b)}</span>
            <span className="chip"><span className="dot ok" />Delta {formatSeconds(Math.abs(b - a))}</span>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <textarea
            aria-label="Logic capture text"
            rows={16}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: 6, resize: "vertical" }}
          />
        </div>
      </div>

      {parsed.error && <p className="muted" style={{ color: "var(--danger)" }}>{parsed.error}</p>}
      {capture && <TimingCanvas capture={capture} annotations={annotations} cursorA={a} cursorB={b} zoom={zoom} pan={pan} />}

      <div className="card" style={{ marginTop: 12 }}>
        <table className="tbl">
          <thead><tr><th>Protocol</th><th>Start</th><th>End</th><th>Label</th><th>Data</th></tr></thead>
          <tbody>
            {annotations.map((a, i) => <tr key={`${a.protocol}-${a.start}-${i}`}>
              <td>{a.protocol}</td>
              <td><code>{formatSeconds(a.start)}</code></td>
              <td><code>{formatSeconds(a.end)}</code></td>
              <td><span className="tag" style={{ color: a.valid === false ? "var(--danger)" : undefined }}>{a.label}</span></td>
              <td><code>{JSON.stringify(a.data ?? {})}</code></td>
            </tr>)}
            {!annotations.length && <tr><td colSpan={5} className="muted">No decoded events.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProtocolControls(props: {
  protocol: Protocol; names: string[]; baud: number; setBaud: (v: number) => void;
  uartChannel: string; setUartChannel: (v: string) => void;
  sdaName: string; setSdaName: (v: string) => void; sclName: string; setSclName: (v: string) => void;
  mosiName: string; setMosiName: (v: string) => void; misoName: string; setMisoName: (v: string) => void;
  sckName: string; setSckName: (v: string) => void; csName: string; setCsName: (v: string) => void;
  spiMode: 0 | 1 | 2 | 3; setSpiMode: (v: 0 | 1 | 2 | 3) => void;
}) {
  const opts = props.names.length ? props.names : ["rx"];
  if (props.protocol === "UART") return (
    <div className="grid cols2">
      <label className="field">RX channel <ChannelSelect names={opts} value={props.uartChannel} onChange={props.setUartChannel} /></label>
      <label className="field">Baud <input type="number" min={1} value={props.baud} onChange={(e) => props.setBaud(+e.target.value || 1)} /></label>
    </div>
  );
  if (props.protocol === "I2C") return (
    <div className="grid cols2">
      <label className="field">SDA <ChannelSelect names={opts} value={props.sdaName} onChange={props.setSdaName} /></label>
      <label className="field">SCL <ChannelSelect names={opts} value={props.sclName} onChange={props.setSclName} /></label>
    </div>
  );
  return (
    <div className="grid cols3">
      <label className="field">MOSI <ChannelSelect names={opts} value={props.mosiName} onChange={props.setMosiName} /></label>
      <label className="field">MISO <ChannelSelect names={opts} value={props.misoName} onChange={props.setMisoName} /></label>
      <label className="field">SCK <ChannelSelect names={opts} value={props.sckName} onChange={props.setSckName} /></label>
      <label className="field">CS <ChannelSelect names={opts} value={props.csName} onChange={props.setCsName} /></label>
      <label className="field">Mode
        <select value={props.spiMode} onChange={(e) => props.setSpiMode(Number(e.target.value) as 0 | 1 | 2 | 3)}>
          {[0, 1, 2, 3].map((m) => <option key={m} value={m}>Mode {m}</option>)}
        </select>
      </label>
    </div>
  );
}

function ChannelSelect({ names, value, onChange }: { names: string[]; value: string; onChange: (v: string) => void }) {
  const current = names.includes(value) ? value : names[0] ?? "";
  useEffect(() => { if (current && current !== value) onChange(current); }, [current, onChange, value]);
  return <select value={current} onChange={(e) => onChange(e.target.value)}>{names.map((n) => <option key={n} value={n}>{n}</option>)}</select>;
}

function TimingCanvas({ capture, annotations, cursorA, cursorB, zoom, pan }: {
  capture: LogicCapture; annotations: LogicAnnotation[]; cursorA: number; cursorB: number; zoom: number; pan: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.max(300, capture.channels.length * 46 + 92);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const width = Math.max(520, canvas.clientWidth || 900);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTiming(ctx, width, height, capture, annotations, cursorA, cursorB, zoom, pan);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [annotations, capture, cursorA, cursorB, height, pan, zoom]);

  return (
    <div className="card" style={{ padding: 0, marginTop: 12 }}>
      <canvas ref={ref} aria-label="Logic timing diagram" style={{ width: "100%", height, display: "block" }} />
    </div>
  );
}

function drawTiming(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  capture: LogicCapture,
  annotations: LogicAnnotation[],
  cursorA: number,
  cursorB: number,
  zoom: number,
  pan: number,
) {
  const css = getComputedStyle(document.documentElement);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const base = color("--base") || "#0d1117";
  const border = color("--border") || "#30363d";
  const muted = color("--muted") || "#8b949e";
  const text = color("--text") || "#e6edf3";
  const accent = color("--accent-soft") || "#58a6ff";
  const ok = "#3fb950";
  const warn = "#d29922";
  const total = captureDuration(capture);
  const windowSize = total / Math.max(1, zoom);
  const start = Math.max(0, Math.min(total - windowSize, (total - windowSize) * pan));
  const end = start + windowSize;
  const left = 92, right = 18, top = 54, rowH = 46;
  const chartW = Math.max(1, width - left - right);
  const toX = (t: number) => left + ((t - start) / (end - start || 1)) * chartW;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  ctx.font = "11px Cascadia Code, Consolas, monospace";
  ctx.textBaseline = "middle";

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const t = start + (i / 8) * (end - start);
    const x = toX(t);
    ctx.beginPath();
    ctx.moveTo(x, top - 18);
    ctx.lineTo(x, height - 28);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.fillText(formatSeconds(t), x + 4, height - 14);
  }

  annotations.forEach((a, i) => {
    if (a.end < start || a.start > end) return;
    const x1 = Math.max(left, toX(a.start));
    const x2 = Math.min(width - right, toX(Math.max(a.end, a.start + (end - start) * 0.01)));
    const y = 12 + (i % 2) * 17;
    ctx.fillStyle = a.protocol === "UART" ? accent : a.protocol === "I2C" ? ok : warn;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(x1, y - 8, Math.max(3, x2 - x1), 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = text;
    ctx.fillText(a.label, x1 + 4, y);
  });

  capture.channels.forEach((ch, idx) => {
    const mid = top + idx * rowH + 22;
    const high = mid - 13;
    const low = mid + 13;
    ctx.fillStyle = text;
    ctx.fillText(ch.name, 12, mid);
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(left, mid);
    ctx.lineTo(width - right, mid);
    ctx.stroke();

    let current = sampleValue(ch, start);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, current ? high : low);
    for (const change of ch.changes) {
      if (change.time <= start || change.time > end) continue;
      const x = toX(change.time);
      ctx.lineTo(x, current ? high : low);
      current = change.value;
      ctx.lineTo(x, current ? high : low);
    }
    ctx.lineTo(width - right, current ? high : low);
    ctx.stroke();
  });

  [
    { t: cursorA, c: "#f85149", label: "A" },
    { t: cursorB, c: warn, label: "B" },
  ].forEach((cur) => {
    if (cur.t < start || cur.t > end) return;
    const x = toX(cur.t);
    ctx.strokeStyle = cur.c;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top - 24);
    ctx.lineTo(x, height - 28);
    ctx.stroke();
    ctx.fillStyle = cur.c;
    ctx.fillText(cur.label, x + 4, top - 30);
  });
}

function decodeSelected(capture: LogicCapture | null, protocol: Protocol, opts: {
  baud: number; uartChannel: string; sdaName: string; sclName: string; mosiName: string; misoName: string;
  sckName: string; csName: string; spiMode: 0 | 1 | 2 | 3;
}): LogicAnnotation[] {
  if (!capture) return [];
  if (protocol === "UART") {
    const rx = findChannel(capture, opts.uartChannel) ?? capture.channels[0];
    return rx ? decodeUart(rx, opts.baud) : [];
  }
  if (protocol === "I2C") {
    const sda = findChannel(capture, opts.sdaName) ?? capture.channels[0];
    const scl = findChannel(capture, opts.sclName) ?? capture.channels[1];
    return sda && scl ? decodeI2c(sda, scl) : [];
  }
  const mosi = findChannel(capture, opts.mosiName) ?? capture.channels[0];
  const sck = findChannel(capture, opts.sckName) ?? capture.channels[1];
  const miso = findChannel(capture, opts.misoName);
  const cs = findChannel(capture, opts.csName);
  return mosi && sck ? decodeSpi({ mosi, sck, miso, cs, mode: opts.spiMode }) : [];
}

function quote(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}
