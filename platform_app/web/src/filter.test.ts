import { describe, expect, it } from "vitest";
import { designFilter, exportFilterCsv, nearestFilterPoint, type FilterParams } from "./filter.ts";

const base: FilterParams = {
  topology: "rc_lowpass",
  r: 1_000,
  c: 1e-6,
  l: 10e-3,
  gain: 1,
  q: 0.707,
  fStart: 10,
  fStop: 100_000,
  points: 120,
};

describe("filter designer core", () => {
  it("RC low-pass is about -3 dB at cutoff", () => {
    const res = designFilter({ ...base, fStart: 1, fStop: 10_000, points: 200 });
    const atFc = nearestFilterPoint(res, res.fc);
    expect(res.fc).toBeCloseTo(159.15, 1);
    expect(atFc.magDb).toBeCloseTo(-3.01, 0);
    expect(atFc.phaseDeg).toBeGreaterThan(-46);
    expect(atFc.phaseDeg).toBeLessThan(-44);
  });

  it("RC high-pass attenuates low frequencies and passes high frequencies", () => {
    const res = designFilter({ ...base, topology: "rc_highpass", fStart: 1, fStop: 1_000_000, points: 80 });
    expect(res.points[0]!.magDb).toBeLessThan(-35);
    expect(res.points[res.points.length - 1]!.magDb).toBeCloseTo(0, 1);
  });

  it("RLC band-pass peaks near resonance", () => {
    const res = designFilter({
      ...base,
      topology: "rlc_bandpass",
      r: 100,
      c: 100e-9,
      l: 10e-3,
      fStart: 100,
      fStop: 100_000,
      points: 220,
    });
    const peak = res.points.reduce((best, point) => point.magDb > best.magDb ? point : best);
    expect(res.fc).toBeCloseTo(5032.92, 1);
    expect(Math.abs(Math.log(peak.f / res.fc))).toBeLessThan(0.05);
    expect(peak.magDb).toBeCloseTo(0, 1);
  });

  it("active low-pass applies gain and exports CSV", () => {
    const res = designFilter({ ...base, topology: "active_lowpass", r: 10_000, c: 10e-9, gain: 2, q: 0.707 });
    expect(res.points[0]!.magDb).toBeCloseTo(6.02, 1);
    expect(res.points[res.points.length - 1]!.magDb).toBeLessThan(-40);
    expect(exportFilterCsv(res)).toContain("frequency_hz,magnitude_db,phase_deg");
  });
});
