import { describe, expect, it } from "vitest";
import {
  segSegDist, segPtDist, clearanceDrc, buildPour, buildPnp, boardRect,
  buildCopperGerber, buildEdgeGerber,
  type TrackGeo, type PadGeo,
} from "./pcb.ts";
import { serialize, deserialize, type UcpProject } from "./project.ts";

const track = (sig: string, net: string, pts: [number, number][], layer: "F" | "B" = "F"): TrackGeo =>
  ({ sig, layer, net, w: 3.5, points: pts.map(([x, y]) => ({ x, y })) });
const pad = (id: string, net: string, x: number, y: number): PadGeo => ({ id, net, x, y, half: 5 });

describe("геометрия сегментов", () => {
  it("расстояние точка-сегмент: проекция и концы", () => {
    expect(segPtDist({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 })).toBeCloseTo(3, 6);
    expect(segPtDist({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 14, y: 3 })).toBeCloseTo(5, 6);
  });
  it("параллельные сегменты и пересечение", () => {
    expect(segSegDist({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 4 }, { x: 10, y: 4 })).toBeCloseTo(4, 6);
    expect(segSegDist({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(0);
  });
});

describe("clearance-DRC", () => {
  it("параллельные дорожки разных цепей слишком близко → нарушение", () => {
    const t1 = track("A", "N1", [[0, 0], [100, 0]]);
    const t2 = track("B", "N2", [[0, 6], [100, 6]]);
    // зазор краёв = 6 − 3.5 = 2.5 < 4
    const v = clearanceDrc([t1, t2], [], 4);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("track-track");
    expect(v[0].gap).toBeCloseTo(2.5, 5);
  });
  it("та же пара: одна цепь или разные слои → чисто", () => {
    const t1 = track("A", "N1", [[0, 0], [100, 0]]);
    expect(clearanceDrc([t1, track("B", "N1", [[0, 6], [100, 6]])], [], 4)).toHaveLength(0);
    expect(clearanceDrc([t1, track("B", "N2", [[0, 6], [100, 6]], "B")], [], 4)).toHaveLength(0);
  });
  it("пересечение дорожек разных цепей → gap < 0", () => {
    const v = clearanceDrc([
      track("A", "N1", [[0, 0], [100, 0]]),
      track("B", "N2", [[50, -20], [50, 20]]),
    ], [], 1);
    expect(v).toHaveLength(1);
    expect(v[0].gap).toBeLessThan(0);
  });
  it("дорожка рядом с чужим падом → нарушение; со своим — нет", () => {
    const t = track("A", "N1", [[0, 0], [100, 0]]);
    const near = pad("R1.1", "N2", 50, 8);   // зазор = 8 − 1.75 − 5 = 1.25
    expect(clearanceDrc([t], [near], 2)).toHaveLength(1);
    expect(clearanceDrc([t], [pad("R1.1", "N1", 50, 8)], 2)).toHaveLength(0);
  });
  it("пад-пад разных цепей вплотную → нарушение", () => {
    const v = clearanceDrc([], [pad("a", "N1", 0, 0), pad("b", "N2", 11, 0)], 2);
    expect(v).toHaveLength(1);
    expect(v[0].gap).toBeCloseTo(1, 5);
  });
});

describe("copper pour", () => {
  const board = { x0: 40, y0: 40, x1: 140, y1: 140 };
  it("пустая плата → полосы почти на всю площадь", () => {
    const strips = buildPour({ board, net: "GND", tracks: [], pads: [], clearancePx: 2 });
    expect(strips.length).toBeGreaterThan(15);
    for (const s of strips) {
      expect(s.x0).toBeGreaterThanOrEqual(board.x0);
      expect(s.x1).toBeLessThanOrEqual(board.x1);
    }
  });
  it("полосы обходят чужой пад с зазором, свой — нет", () => {
    const foreign = pad("R1.1", "N1", 90, 90);
    const strips = buildPour({ board, net: "GND", tracks: [], pads: [foreign], clearancePx: 4 });
    for (const s of strips) {
      // прямоугольник полосы не должен приближаться к чужому паду ближе r
      const dx = Math.max(s.x0 - foreign.x, 0, foreign.x - s.x1);
      const dy = Math.max(s.y0 - foreign.y, 0, foreign.y - s.y1);
      expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(5 + 4 - 0.01);
    }
    // свой пад заливается
    const own = pad("J1.1", "GND", 90, 90);
    const strips2 = buildPour({ board, net: "GND", tracks: [], pads: [own], clearancePx: 4 });
    const covering = strips2.some((s) => s.x0 <= 90 && s.x1 >= 90 && s.y0 <= 90 && s.y1 >= 90);
    expect(covering).toBe(true);
  });
  it("чужая F-дорожка вычитается, B-дорожка — нет", () => {
    const tf = track("A", "N1", [[40, 88], [140, 88]]);
    const strips = buildPour({ board, net: "GND", tracks: [tf], pads: [], clearancePx: 4 });
    // строка с дорожкой полностью блокирована по x → нет полос, перекрывающих y=88
    expect(strips.some((s) => s.y0 <= 88 && s.y1 >= 88)).toBe(false);
    const tb = track("B", "N1", [[40, 88], [140, 88]], "B");
    const strips2 = buildPour({ board, net: "GND", tracks: [tb], pads: [], clearancePx: 4 });
    expect(strips2.some((s) => s.y0 <= 88 && s.y1 >= 88)).toBe(true);
  });
});

describe("фаб-выходы", () => {
  it("pick-and-place: мм от левого нижнего угла платы", () => {
    const b = boardRect({ w: 90, h: 65 });   // 40..400 × 40..300
    const csv = buildPnp([{ ref: "R1", value: "10k", footprint: "R_0805", x: 80, y: 280, rot: 90 }], b);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Ref,Val,Package,PosX,PosY,Rot,Side");
    expect(lines[1]).toBe("R1,10k,R_0805,10.000,5.000,90,top");
  });
  it("Gerber: регионы заливки G36/G37 и контур Edge.Cuts", () => {
    const g = buildCopperGerber({ pads: [{ x: 50, y: 50 }], paths: [], pour: [{ x0: 42, y0: 42, x1: 90, y1: 46 }] });
    expect(g).toContain("G36*");
    expect(g).toContain("G37*");
    expect(g).toContain("D03*");
    const e = buildEdgeGerber(boardRect());
    expect(e.split("\n").filter((l) => l.endsWith("D01*"))).toHaveLength(4);
    expect(e).toContain("M02*");
  });
});

describe("дорожки в модели (.ucp round-trip)", () => {
  it("tracks и board переживают serialize/deserialize; мусор отфильтровывается", () => {
    const p: UcpProject = {
      version: 1, name: "T",
      components: [
        { id: "a", ref: "R1", kind: "R", value: "1k", x: 0, y: 0 },
        { id: "b", ref: "C1", kind: "C", value: "1u", x: 0, y: 0 },
      ],
      wires: [{ from: { ref: "R1", pin: "2" }, to: { ref: "C1", pin: "1" } }],
      labels: [],
      tracks: [{ sig: "R1.2-C1.1", layer: "F", points: [{ x: 1, y: 2 }, { x: 3, y: 2 }] }],
      board: { w: 80, h: 60 },
    };
    const r = deserialize(serialize(p));
    expect(r.tracks).toHaveLength(1);
    expect(r.tracks[0].points).toEqual([{ x: 1, y: 2 }, { x: 3, y: 2 }]);
    expect(r.board).toEqual({ w: 80, h: 60 });
    // дорожка на несуществующий провод и с 1 точкой — отбрасываются
    const bad = JSON.parse(serialize(p));
    bad.project.tracks = [
      { sig: "X1.1-Y1.1", layer: "F", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
      { sig: "R1.2-C1.1", layer: "F", points: [{ x: 0, y: 0 }] },
    ];
    expect(deserialize(JSON.stringify(bad)).tracks).toHaveLength(0);
  });
});
