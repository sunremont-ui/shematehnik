import { describe, expect, it } from "vitest";
import { defaultPinPlan, generatePinInit, getMcu, validatePinPlan, type PinAssignment } from "./pinplanner.ts";

describe("pin planner core", () => {
  it("detects duplicate peripheral function conflicts", () => {
    const mcu = getMcu("stm32f103c8");
    const issues = validatePinPlan(mcu, [
      { pinId: "pb6", functionId: "I2C1_SCL" },
      { pinId: "pb8", functionId: "I2C1_SCL" },
    ]);
    expect(issues.some((i) => i.severity === "error" && i.message.includes("more than once"))).toBe(true);
  });

  it("rejects unsupported pin functions", () => {
    const mcu = getMcu("stm32f103c8");
    const issues = validatePinPlan(mcu, [{ pinId: "pa9", functionId: "I2C1_SCL" }]);
    expect(issues[0]?.message).toContain("does not support");
  });

  it("generates Arduino init code for GPIO and I2C", () => {
    const mcu = getMcu("atmega328p-uno");
    const code = generatePinInit(mcu, defaultPinPlan(mcu));
    expect(code).toContain("Wire.begin();");
    expect(code).toContain("pinMode(13, OUTPUT);");
  });

  it("generates STM32 HAL GPIO init shape", () => {
    const mcu = getMcu("stm32f103c8");
    const plan: PinAssignment[] = [{ pinId: "pa9", functionId: "USART1_TX", label: "debug_tx" }];
    const code = generatePinInit(mcu, plan);
    expect(code).toContain("MX_PinPlanner_Init");
    expect(code).toContain("GPIO_PIN_9");
    expect(code).toContain("USART1 TX");
  });
});
