import { getLibraryParts, type LibPart } from "./data/library.ts";
import { nextRef, pinsOf, type NetLabel, type SchComponent, type SchWire, type UcpProject } from "./project.ts";

export interface AiComponent { ref?: string; kind?: string; value?: string; x?: number; y?: number; footprint?: string; }
export interface AiWire { from: { ref: string; pin: string }; to: { ref: string; pin: string }; }
export interface AiSchematicResult { components: AiComponent[]; wires: AiWire[]; }
export interface AiPlacement { components: SchComponent[]; wires: SchWire[]; labels: NetLabel[]; }

const KINDS = new Set(["R", "C", "L", "D", "Q", "U"]);

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["components", "wires"],
  properties: {
    components: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "value", "x", "y"],
        properties: {
          ref: { type: "string" },
          kind: { type: "string", enum: ["R", "C", "L", "D", "Q", "U"] },
          value: { type: "string" },
          footprint: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
        },
      },
    },
    wires: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to"],
        properties: {
          from: { type: "object", additionalProperties: false, required: ["ref", "pin"], properties: { ref: { type: "string" }, pin: { type: "string" } } },
          to: { type: "object", additionalProperties: false, required: ["ref", "pin"], properties: { ref: { type: "string" }, pin: { type: "string" } } },
        },
      },
    },
  },
};

export function placeAiResult(project: UcpProject, result: AiSchematicResult): AiPlacement {
  const existing = [...project.components];
  const refMap = new Map<string, string>();
  const usedRefs = new Set(existing.map((c) => c.ref));
  let uid = Date.now();
  const components = (result.components ?? []).map((raw, i) => {
    const kind = KINDS.has(String(raw.kind)) ? String(raw.kind) : "U";
    const wanted = String(raw.ref || "").trim();
    let ref = wanted && !usedRefs.has(wanted) ? wanted : nextRef(existing, kind);
    while (usedRefs.has(ref)) ref = nextRef(existing, kind);
    usedRefs.add(ref);
    existing.push({ id: `ai${uid++}`, ref, kind, value: String(raw.value || kind), x: 0, y: 0 });
    if (wanted) refMap.set(wanted, ref);
    refMap.set(ref, ref);
    const lib = getLibraryParts(project.userParts).find((p) => p.kind === kind && p.value === raw.value);
    return {
      id: `ai${uid++}`,
      ref,
      kind,
      value: String(raw.value || lib?.value || kind),
      x: Math.round(120 + Number(raw.x ?? i % 4) * 90),
      y: Math.round(100 + Number(raw.y ?? Math.floor(i / 4)) * 70),
      ...(raw.footprint || lib?.footprint ? { footprint: String(raw.footprint || lib?.footprint) } : {}),
    } satisfies SchComponent;
  });
  const compRefs = new Set(components.map((c) => c.ref));
  const kindOf = new Map(components.map((c) => [c.ref, c.kind]));
  const validPin = (ref: string, pin: string) => compRefs.has(ref) && pinsOf(kindOf.get(ref) ?? "U").includes(pin);
  const wires = (result.wires ?? []).map((w) => ({
    from: { ref: refMap.get(w.from.ref) ?? w.from.ref, pin: String(w.from.pin) },
    to: { ref: refMap.get(w.to.ref) ?? w.to.ref, pin: String(w.to.pin) },
  })).filter((w): w is SchWire => validPin(w.from.ref, w.from.pin) && validPin(w.to.ref, w.to.pin));
  return { components, wires, labels: [] };
}

export function demoAiSchematic(): AiSchematicResult {
  return {
    components: [
      { ref: "U1", kind: "U", value: "STM32F401", x: 0, y: 0, footprint: "LQFP-48" },
      { ref: "R1", kind: "R", value: "330", x: 2, y: 0, footprint: "R_0805" },
      { ref: "D1", kind: "D", value: "LED", x: 4, y: 0, footprint: "LED_0805" },
    ],
    wires: [
      { from: { ref: "U1", pin: "4" }, to: { ref: "R1", pin: "1" } },
      { from: { ref: "R1", pin: "2" }, to: { ref: "D1", pin: "1" } },
      { from: { ref: "D1", pin: "2" }, to: { ref: "U1", pin: "6" } },
    ],
  };
}

function systemPrompt(parts: LibPart[]): string {
  const catalog = parts.slice(0, 60).map((p) => `${p.id}: kind=${p.kind}, value=${p.value}, footprint=${p.footprint}, pins=${pinsOf(p.kind).join("/")}`).join("\n");
  return `You generate schematic JSON for UCP. Use only kinds R/C/L/D/Q/U. Coordinates are grid units, small integers. Pins must exist for the kind. Available parts:\n${catalog}`;
}

function parseJsonFromAnthropic(data: unknown): AiSchematicResult {
  const d = data as { output_parsed?: unknown; content?: Array<{ type?: string; text?: string }> };
  if (d.output_parsed) return d.output_parsed as AiSchematicResult;
  const text = d.content?.map((c) => c.text || "").join("\n") ?? "";
  const json = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(json) as AiSchematicResult;
}

export async function requestAiSchematic(apiKey: string, prompt: string, parts: LibPart[]): Promise<AiSchematicResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: systemPrompt(parts),
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema } },
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Authentication failed: проверьте Claude API key");
    if (res.status === 429) throw new Error(`Rate limit: retry later${res.headers.get("retry-after") ? ` (${res.headers.get("retry-after")}s)` : ""}`);
    throw new Error(`Claude API error ${res.status}`);
  }
  return parseJsonFromAnthropic(await res.json());
}
