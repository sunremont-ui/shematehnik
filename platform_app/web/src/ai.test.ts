import { describe, expect, it } from "vitest";
import { placeAiResult, type AiSchematicResult } from "./ai.ts";
import { emptyProject } from "./project.ts";

describe("placeAiResult", () => {
  it("keeps refs unique and remaps wires", () => {
    const p = emptyProject();
    const result: AiSchematicResult = {
      components: [
        { ref: "R1", kind: "R", value: "1k", x: 1, y: 1 },
        { ref: "D1", kind: "D", value: "LED", x: 2, y: 1 },
      ],
      wires: [{ from: { ref: "R1", pin: "1" }, to: { ref: "D1", pin: "1" } }],
    };
    const placed = placeAiResult(p, result);
    expect(placed.components.map((c) => c.ref)).toEqual(["R2", "D1"]);
    expect(placed.wires[0]).toEqual({ from: { ref: "R2", pin: "1" }, to: { ref: "D1", pin: "1" } });
  });

  it("falls back unknown kind to U and drops invalid wires", () => {
    const placed = placeAiResult(emptyProject(), {
      components: [{ ref: "X1", kind: "SENSOR", value: "Thing", x: 0, y: 0 }],
      wires: [{ from: { ref: "X1", pin: "9" }, to: { ref: "X1", pin: "1" } }],
    });
    expect(placed.components[0].kind).toBe("U");
    expect(placed.wires).toHaveLength(0);
  });
});
