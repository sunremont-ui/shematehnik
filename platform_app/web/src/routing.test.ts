import { describe, it, expect } from "vitest";
import { routeOrthogonal, routeOrthogonalEx, type Rect } from "./routing.ts";

// Прямоугольник пересекает любой сегмент пути?
function pathHitsRect(pts: { x: number; y: number }[], r: Rect): boolean {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    if (x0 <= r.x1 && x1 >= r.x0 && y0 <= r.y1 && y1 >= r.y0) return true;
  }
  return false;
}

describe("routeOrthogonal", () => {
  it("returns a path that starts and ends at the endpoints", () => {
    const pts = routeOrthogonal({ x: 0, y: 0 }, { x: 100, y: 0 }, []);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 0 });
  });

  it("goes straight with no obstacles", () => {
    const pts = routeOrthogonal({ x: 0, y: 0 }, { x: 100, y: 0 }, []);
    expect(pts).toHaveLength(2); // одна прямая
  });

  it("routes around a blocking obstacle", () => {
    // препятствие точно на прямой между точками
    const wall: Rect = { x0: 40, y0: -20, x1: 60, y1: 20 };
    const pts = routeOrthogonal({ x: 0, y: 0 }, { x: 100, y: 0 }, [wall]);
    expect(pathHitsRect(pts, { x0: 44, y0: -16, x1: 56, y1: 16 })).toBe(false); // не режет ядро препятствия
    expect(pts.length).toBeGreaterThan(2); // появились изгибы
  });

  it("routeOrthogonalEx reports found", () => {
    expect(routeOrthogonalEx({ x: 0, y: 0 }, { x: 100, y: 0 }, []).found).toBe(true);
    // точка a замурована со всех сторон → пути нет
    const boxedIn: Rect = { x0: -12, y0: -12, x1: 12, y1: 12 };
    expect(routeOrthogonalEx({ x: 0, y: 0 }, { x: 100, y: 0 }, [boxedIn]).found).toBe(false);
  });

  it("only emits orthogonal segments", () => {
    const pts = routeOrthogonal({ x: 0, y: 0 }, { x: 80, y: 60 }, [{ x0: 20, y0: 20, x1: 50, y1: 50 }]);
    for (let i = 0; i + 1 < pts.length; i++)
      expect(pts[i].x === pts[i + 1].x || pts[i].y === pts[i + 1].y).toBe(true);
  });
});
