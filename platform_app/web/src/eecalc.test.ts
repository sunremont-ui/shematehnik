import { describe, expect, test } from "vitest";
import {
  calculateLdoThermal,
  calculateLedResistor,
  calculateTraceWidth,
  calculateVoltageDivider,
  nearestPreferredResistor,
  solveDividerBottom,
} from "./eecalc.ts";

describe("EE calculators", () => {
  test("calculates unloaded and loaded voltage dividers", () => {
    const unloaded = calculateVoltageDivider({ vin: 12, rTop: 10_000, rBottom: 10_000 });
    expect(unloaded.vout).toBeCloseTo(6, 6);
    expect(unloaded.dividerCurrentA).toBeCloseTo(0.0006, 7);

    const loaded = calculateVoltageDivider({ vin: 12, rTop: 10_000, rBottom: 10_000, loadOhm: 10_000 });
    expect(loaded.rBottomEffective).toBeCloseTo(5_000, 6);
    expect(loaded.vout).toBeCloseTo(4, 6);
  });

  test("solves divider bottom resistor for a target voltage", () => {
    const rBottom = solveDividerBottom(5, 3.3, 10_000);
    expect(rBottom).toBeCloseTo(19_411.7647, 3);
  });

  test("sizes LED resistor and nearest E12 value", () => {
    const led = calculateLedResistor({ supplyVoltage: 5, forwardVoltage: 2, currentA: 0.02, ledsInSeries: 1 });
    expect(led.resistorOhm).toBeCloseTo(150, 6);
    expect(led.nearestE12Ohm).toBe(150);
    expect(led.nearestPowerW).toBeCloseTo(0.06, 6);
    expect(led.recommendedWattageW).toBe(0.125);
    expect(nearestPreferredResistor(151)).toBe(150);
  });

  test("calculates IPC-2221 trace width and internal layer penalty", () => {
    const external = calculateTraceWidth({ currentA: 2, tempRiseC: 10, copperOz: 1, lengthMm: 100, layer: "external" });
    const internal = calculateTraceWidth({ currentA: 2, tempRiseC: 10, copperOz: 1, lengthMm: 100, layer: "internal" });
    expect(external.widthMm).toBeGreaterThan(0.7);
    expect(external.widthMm).toBeLessThan(0.9);
    expect(internal.widthMm).toBeGreaterThan(external.widthMm);
    expect(external.voltageDropV).toBeGreaterThan(0);
  });

  test("estimates LDO junction temperature and current margin", () => {
    const ldo = calculateLdoThermal({
      vin: 12,
      vout: 5,
      currentA: 0.1,
      thetaJaCPerW: 50,
      ambientC: 25,
      maxJunctionC: 125,
    });
    expect(ldo.dissipatedW).toBeCloseTo(0.7, 6);
    expect(ldo.junctionC).toBeCloseTo(60, 6);
    expect(ldo.maxCurrentA).toBeCloseTo(0.285714, 6);
    expect(ldo.status).toBe("ok");
  });
});
