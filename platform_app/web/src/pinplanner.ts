export type PinRole = "io" | "power" | "ground" | "reset" | "boot";
export type PinSide = "left" | "right";
export type PinFunctionKind =
  | "gpio_input"
  | "gpio_output"
  | "uart_tx"
  | "uart_rx"
  | "spi_sck"
  | "spi_mosi"
  | "spi_miso"
  | "i2c_scl"
  | "i2c_sda"
  | "adc"
  | "pwm";

export interface PinCapability {
  id: string;
  label: string;
  kind: PinFunctionKind;
  peripheral?: string;
  unique: boolean;
}

export interface McuPin {
  id: string;
  name: string;
  side: PinSide;
  order: number;
  role: PinRole;
  capabilities: PinCapability[];
  port?: string;
  bit?: number;
  arduinoPin?: string;
  espGpio?: number;
}

export interface McuDef {
  id: string;
  name: string;
  packageName: string;
  target: "stm32-hal" | "arduino" | "esp-idf";
  pins: McuPin[];
}

export interface PinAssignment {
  pinId: string;
  functionId: string;
  label?: string;
}

export interface PinPlanIssue {
  severity: "error" | "warn";
  pinIds: string[];
  message: string;
}

const cap = (
  id: string,
  label: string,
  kind: PinFunctionKind,
  peripheral?: string,
  unique = kind !== "gpio_input" && kind !== "gpio_output",
): PinCapability => ({ id, label, kind, peripheral, unique });

const GPIO_IN = cap("GPIO_INPUT", "GPIO input", "gpio_input", undefined, false);
const GPIO_OUT = cap("GPIO_OUTPUT", "GPIO output", "gpio_output", undefined, false);

const pin = (
  id: string,
  name: string,
  side: PinSide,
  order: number,
  role: PinRole,
  capabilities: PinCapability[] = [],
  meta: Pick<McuPin, "port" | "bit" | "arduinoPin" | "espGpio"> = {},
): McuPin => ({ id, name, side, order, role, capabilities, ...meta });

export const MCU_DEFS: McuDef[] = [
  {
    id: "stm32f103c8",
    name: "STM32F103C8 Blue Pill",
    packageName: "LQFP-48 / Blue Pill header",
    target: "stm32-hal",
    pins: [
      pin("pa0", "PA0", "left", 0, "io", [GPIO_IN, GPIO_OUT, cap("ADC1_IN0", "ADC1 IN0", "adc", "ADC1"), cap("TIM2_CH1", "TIM2 CH1 PWM", "pwm", "TIM2")], { port: "A", bit: 0 }),
      pin("pa1", "PA1", "left", 1, "io", [GPIO_IN, GPIO_OUT, cap("ADC1_IN1", "ADC1 IN1", "adc", "ADC1"), cap("TIM2_CH2", "TIM2 CH2 PWM", "pwm", "TIM2")], { port: "A", bit: 1 }),
      pin("pa2", "PA2", "left", 2, "io", [GPIO_IN, GPIO_OUT, cap("USART2_TX", "USART2 TX", "uart_tx", "USART2"), cap("ADC1_IN2", "ADC1 IN2", "adc", "ADC1")], { port: "A", bit: 2 }),
      pin("pa3", "PA3", "left", 3, "io", [GPIO_IN, GPIO_OUT, cap("USART2_RX", "USART2 RX", "uart_rx", "USART2"), cap("ADC1_IN3", "ADC1 IN3", "adc", "ADC1")], { port: "A", bit: 3 }),
      pin("pa5", "PA5", "left", 4, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_SCK", "SPI1 SCK", "spi_sck", "SPI1")], { port: "A", bit: 5 }),
      pin("pa6", "PA6", "left", 5, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_MISO", "SPI1 MISO", "spi_miso", "SPI1")], { port: "A", bit: 6 }),
      pin("pa7", "PA7", "left", 6, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_MOSI", "SPI1 MOSI", "spi_mosi", "SPI1")], { port: "A", bit: 7 }),
      pin("gnd1", "GND", "left", 7, "ground"),
      pin("3v3", "3V3", "right", 0, "power"),
      pin("pb6", "PB6", "right", 1, "io", [GPIO_IN, GPIO_OUT, cap("I2C1_SCL", "I2C1 SCL", "i2c_scl", "I2C1"), cap("USART1_TX", "USART1 TX remap", "uart_tx", "USART1")], { port: "B", bit: 6 }),
      pin("pb7", "PB7", "right", 2, "io", [GPIO_IN, GPIO_OUT, cap("I2C1_SDA", "I2C1 SDA", "i2c_sda", "I2C1"), cap("USART1_RX", "USART1 RX remap", "uart_rx", "USART1")], { port: "B", bit: 7 }),
      pin("pb8", "PB8", "right", 3, "io", [GPIO_IN, GPIO_OUT, cap("I2C1_SCL", "I2C1 SCL remap", "i2c_scl", "I2C1"), cap("TIM4_CH3", "TIM4 CH3 PWM", "pwm", "TIM4")], { port: "B", bit: 8 }),
      pin("pb9", "PB9", "right", 4, "io", [GPIO_IN, GPIO_OUT, cap("I2C1_SDA", "I2C1 SDA remap", "i2c_sda", "I2C1"), cap("TIM4_CH4", "TIM4 CH4 PWM", "pwm", "TIM4")], { port: "B", bit: 9 }),
      pin("pa9", "PA9", "right", 5, "io", [GPIO_IN, GPIO_OUT, cap("USART1_TX", "USART1 TX", "uart_tx", "USART1"), cap("TIM1_CH2", "TIM1 CH2 PWM", "pwm", "TIM1")], { port: "A", bit: 9 }),
      pin("pa10", "PA10", "right", 6, "io", [GPIO_IN, GPIO_OUT, cap("USART1_RX", "USART1 RX", "uart_rx", "USART1")], { port: "A", bit: 10 }),
      pin("nrst", "NRST", "right", 7, "reset"),
    ],
  },
  {
    id: "atmega328p-uno",
    name: "ATmega328P / Arduino Uno",
    packageName: "DIP-28 / Uno headers",
    target: "arduino",
    pins: [
      pin("d0", "D0/RX", "left", 0, "io", [GPIO_IN, GPIO_OUT, cap("UART0_RX", "UART0 RX", "uart_rx", "UART0")], { arduinoPin: "0" }),
      pin("d1", "D1/TX", "left", 1, "io", [GPIO_IN, GPIO_OUT, cap("UART0_TX", "UART0 TX", "uart_tx", "UART0")], { arduinoPin: "1" }),
      pin("d2", "D2", "left", 2, "io", [GPIO_IN, GPIO_OUT], { arduinoPin: "2" }),
      pin("d3", "D3~", "left", 3, "io", [GPIO_IN, GPIO_OUT, cap("PWM_D3", "PWM D3", "pwm", "TIMER2")], { arduinoPin: "3" }),
      pin("d9", "D9~", "left", 4, "io", [GPIO_IN, GPIO_OUT, cap("PWM_D9", "PWM D9", "pwm", "TIMER1")], { arduinoPin: "9" }),
      pin("d10", "D10/SS", "left", 5, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_SS", "SPI SS", "spi_sck", "SPI")], { arduinoPin: "10" }),
      pin("gnd", "GND", "left", 6, "ground"),
      pin("vcc", "5V", "left", 7, "power"),
      pin("d11", "D11/MOSI", "right", 0, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_MOSI", "SPI MOSI", "spi_mosi", "SPI"), cap("PWM_D11", "PWM D11", "pwm", "TIMER2")], { arduinoPin: "11" }),
      pin("d12", "D12/MISO", "right", 1, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_MISO", "SPI MISO", "spi_miso", "SPI")], { arduinoPin: "12" }),
      pin("d13", "D13/SCK", "right", 2, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_SCK", "SPI SCK", "spi_sck", "SPI")], { arduinoPin: "13" }),
      pin("a0", "A0", "right", 3, "io", [GPIO_IN, GPIO_OUT, cap("ADC0", "ADC0", "adc", "ADC")], { arduinoPin: "A0" }),
      pin("a1", "A1", "right", 4, "io", [GPIO_IN, GPIO_OUT, cap("ADC1", "ADC1", "adc", "ADC")], { arduinoPin: "A1" }),
      pin("a4", "A4/SDA", "right", 5, "io", [GPIO_IN, GPIO_OUT, cap("ADC4", "ADC4", "adc", "ADC"), cap("I2C1_SDA", "I2C SDA", "i2c_sda", "I2C")], { arduinoPin: "A4" }),
      pin("a5", "A5/SCL", "right", 6, "io", [GPIO_IN, GPIO_OUT, cap("ADC5", "ADC5", "adc", "ADC"), cap("I2C1_SCL", "I2C SCL", "i2c_scl", "I2C")], { arduinoPin: "A5" }),
      pin("reset", "RESET", "right", 7, "reset"),
    ],
  },
  {
    id: "esp32c3",
    name: "ESP32-C3 DevKit",
    packageName: "DevKit header",
    target: "esp-idf",
    pins: [
      pin("g0", "GPIO0", "left", 0, "io", [GPIO_IN, GPIO_OUT, cap("ADC1_CH0", "ADC1 CH0", "adc", "ADC1"), cap("I2C1_SDA", "I2C SDA", "i2c_sda", "I2C1")], { espGpio: 0 }),
      pin("g1", "GPIO1", "left", 1, "io", [GPIO_IN, GPIO_OUT, cap("ADC1_CH1", "ADC1 CH1", "adc", "ADC1"), cap("I2C1_SCL", "I2C SCL", "i2c_scl", "I2C1")], { espGpio: 1 }),
      pin("g2", "GPIO2", "left", 2, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_MISO", "SPI MISO", "spi_miso", "SPI1")], { espGpio: 2 }),
      pin("g3", "GPIO3", "left", 3, "io", [GPIO_IN, GPIO_OUT, cap("ADC1_CH3", "ADC1 CH3", "adc", "ADC1")], { espGpio: 3 }),
      pin("g4", "GPIO4", "left", 4, "io", [GPIO_IN, GPIO_OUT, cap("UART1_TX", "UART1 TX", "uart_tx", "UART1")], { espGpio: 4 }),
      pin("g5", "GPIO5", "left", 5, "io", [GPIO_IN, GPIO_OUT, cap("UART1_RX", "UART1 RX", "uart_rx", "UART1")], { espGpio: 5 }),
      pin("gnd", "GND", "left", 6, "ground"),
      pin("3v3", "3V3", "left", 7, "power"),
      pin("g6", "GPIO6", "right", 0, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_SCK", "SPI SCK", "spi_sck", "SPI1")], { espGpio: 6 }),
      pin("g7", "GPIO7", "right", 1, "io", [GPIO_IN, GPIO_OUT, cap("SPI1_MOSI", "SPI MOSI", "spi_mosi", "SPI1")], { espGpio: 7 }),
      pin("g8", "GPIO8/BOOT", "right", 2, "boot", [GPIO_IN, GPIO_OUT, cap("PWM_G8", "PWM GPIO8", "pwm", "LEDC")], { espGpio: 8 }),
      pin("g9", "GPIO9/BOOT", "right", 3, "boot", [GPIO_IN, GPIO_OUT, cap("PWM_G9", "PWM GPIO9", "pwm", "LEDC")], { espGpio: 9 }),
      pin("g10", "GPIO10", "right", 4, "io", [GPIO_IN, GPIO_OUT, cap("PWM_G10", "PWM GPIO10", "pwm", "LEDC")], { espGpio: 10 }),
      pin("g18", "GPIO18/USB-", "right", 5, "io", [GPIO_IN, GPIO_OUT], { espGpio: 18 }),
      pin("g19", "GPIO19/USB+", "right", 6, "io", [GPIO_IN, GPIO_OUT], { espGpio: 19 }),
      pin("en", "EN", "right", 7, "reset"),
    ],
  },
];

export function getMcu(id: string): McuDef {
  return MCU_DEFS.find((mcu) => mcu.id === id) ?? MCU_DEFS[0]!;
}

export function capabilityFor(pinDef: McuPin, functionId: string): PinCapability | undefined {
  return pinDef.capabilities.find((c) => c.id === functionId);
}

export function defaultPinPlan(mcu: McuDef): PinAssignment[] {
  const presets: Record<string, PinAssignment[]> = {
    stm32f103c8: [
      { pinId: "pa9", functionId: "USART1_TX", label: "debug_tx" },
      { pinId: "pa10", functionId: "USART1_RX", label: "debug_rx" },
      { pinId: "pb6", functionId: "I2C1_SCL", label: "sensors_scl" },
      { pinId: "pb7", functionId: "I2C1_SDA", label: "sensors_sda" },
      { pinId: "pa5", functionId: "SPI1_SCK", label: "display_sck" },
    ],
    "atmega328p-uno": [
      { pinId: "d13", functionId: "GPIO_OUTPUT", label: "led_builtin" },
      { pinId: "a4", functionId: "I2C1_SDA", label: "bus_sda" },
      { pinId: "a5", functionId: "I2C1_SCL", label: "bus_scl" },
    ],
    esp32c3: [
      { pinId: "g4", functionId: "UART1_TX", label: "debug_tx" },
      { pinId: "g5", functionId: "UART1_RX", label: "debug_rx" },
      { pinId: "g0", functionId: "I2C1_SDA", label: "sda" },
      { pinId: "g1", functionId: "I2C1_SCL", label: "scl" },
    ],
  };
  return (presets[mcu.id] ?? []).map((a) => ({ ...a }));
}

export function validatePinPlan(mcu: McuDef, assignments: PinAssignment[]): PinPlanIssue[] {
  const issues: PinPlanIssue[] = [];
  const pins = new Map(mcu.pins.map((p) => [p.id, p]));
  const byPin = new Map<string, PinAssignment>();
  const byUniqueFunction = new Map<string, PinAssignment>();
  const activeCaps: { assignment: PinAssignment; pinDef: McuPin; capDef: PinCapability }[] = [];

  for (const assignment of assignments) {
    const pinDef = pins.get(assignment.pinId);
    if (!pinDef) {
      issues.push({ severity: "error", pinIds: [assignment.pinId], message: `Unknown pin ${assignment.pinId}` });
      continue;
    }
    const prevPin = byPin.get(assignment.pinId);
    if (prevPin) {
      issues.push({ severity: "error", pinIds: [assignment.pinId], message: `${pinDef.name} has multiple assignments` });
      continue;
    }
    byPin.set(assignment.pinId, assignment);
    const capDef = capabilityFor(pinDef, assignment.functionId);
    if (!capDef) {
      issues.push({ severity: "error", pinIds: [assignment.pinId], message: `${pinDef.name} does not support ${assignment.functionId}` });
      continue;
    }
    activeCaps.push({ assignment, pinDef, capDef });
    if (!capDef.unique) continue;
    const prev = byUniqueFunction.get(capDef.id);
    if (prev) {
      issues.push({
        severity: "error",
        pinIds: [prev.pinId, assignment.pinId],
        message: `${capDef.label} is assigned more than once`,
      });
    } else {
      byUniqueFunction.set(capDef.id, assignment);
    }
  }

  const byPeripheral = new Map<string, Set<PinFunctionKind>>();
  for (const { capDef } of activeCaps) {
    if (!capDef.peripheral) continue;
    const set = byPeripheral.get(capDef.peripheral) ?? new Set<PinFunctionKind>();
    set.add(capDef.kind);
    byPeripheral.set(capDef.peripheral, set);
  }
  for (const [peripheral, kinds] of byPeripheral) {
    if (peripheral.startsWith("I2C") && (kinds.has("i2c_scl") !== kinds.has("i2c_sda"))) {
      issues.push({ severity: "warn", pinIds: [], message: `${peripheral} needs both SCL and SDA` });
    }
    if (peripheral.startsWith("UART") || peripheral.startsWith("USART")) {
      if (kinds.has("uart_tx") !== kinds.has("uart_rx")) issues.push({ severity: "warn", pinIds: [], message: `${peripheral} is half assigned` });
    }
  }
  return issues;
}

export function pinPlanSummary(mcu: McuDef, assignments: PinAssignment[]) {
  const issues = validatePinPlan(mcu, assignments);
  return {
    assigned: assignments.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warn").length,
  };
}

export function generatePinInit(mcu: McuDef, assignments: PinAssignment[]): string {
  const valid = assignments.flatMap((assignment) => {
    const pinDef = mcu.pins.find((p) => p.id === assignment.pinId);
    const capDef = pinDef ? capabilityFor(pinDef, assignment.functionId) : undefined;
    return pinDef && capDef ? [{ assignment, pinDef, capDef }] : [];
  });
  if (mcu.target === "arduino") return genArduinoInit(valid);
  if (mcu.target === "esp-idf") return genEspIdfInit(valid);
  return genStm32Init(valid);
}

function genStm32Init(items: { assignment: PinAssignment; pinDef: McuPin; capDef: PinCapability }[]): string {
  const ports = Array.from(new Set(items.map((i) => i.pinDef.port).filter(Boolean))).sort();
  const out = [
    "// init.c - generated by UCP Pin Planner",
    '#include "main.h"',
    "",
    "void MX_PinPlanner_Init(void) {",
    "    GPIO_InitTypeDef GPIO_InitStruct = {0};",
  ];
  for (const port of ports) out.push(`    __HAL_RCC_GPIO${port}_CLK_ENABLE();`);
  for (const { assignment, pinDef, capDef } of items) {
    if (!pinDef.port || pinDef.bit == null) continue;
    out.push("", `    // ${pinDef.name}: ${assignment.label || capDef.label} (${capDef.label})`);
    out.push(`    GPIO_InitStruct.Pin = GPIO_PIN_${pinDef.bit};`);
    out.push(`    GPIO_InitStruct.Mode = ${stm32Mode(capDef.kind)};`);
    out.push(`    GPIO_InitStruct.Pull = ${capDef.kind === "gpio_input" || capDef.kind === "uart_rx" ? "GPIO_PULLUP" : "GPIO_NOPULL"};`);
    out.push(`    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;`);
    out.push(`    HAL_GPIO_Init(GPIO${pinDef.port}, &GPIO_InitStruct);`);
  }
  out.push("}", "");
  return out.join("\n");
}

function stm32Mode(kind: PinFunctionKind): string {
  if (kind === "gpio_output") return "GPIO_MODE_OUTPUT_PP";
  if (kind === "gpio_input" || kind === "uart_rx") return "GPIO_MODE_INPUT";
  if (kind === "i2c_scl" || kind === "i2c_sda") return "GPIO_MODE_AF_OD";
  if (kind === "adc") return "GPIO_MODE_ANALOG";
  return "GPIO_MODE_AF_PP";
}

function genArduinoInit(items: { assignment: PinAssignment; pinDef: McuPin; capDef: PinCapability }[]): string {
  const usesSerial = items.some((i) => i.capDef.kind === "uart_tx" || i.capDef.kind === "uart_rx");
  const usesWire = items.some((i) => i.capDef.kind === "i2c_scl" || i.capDef.kind === "i2c_sda");
  const usesSpi = items.some((i) => i.capDef.kind === "spi_sck" || i.capDef.kind === "spi_mosi" || i.capDef.kind === "spi_miso");
  const out = ["// init.ino - generated by UCP Pin Planner", "#include <Arduino.h>"];
  if (usesWire) out.push("#include <Wire.h>");
  if (usesSpi) out.push("#include <SPI.h>");
  out.push("", "void pinPlannerInit() {");
  if (usesSerial) out.push("    Serial.begin(115200);");
  if (usesWire) out.push("    Wire.begin();");
  if (usesSpi) out.push("    SPI.begin();");
  for (const { assignment, pinDef, capDef } of items) {
    const pinExpr = pinDef.arduinoPin ?? pinDef.name;
    out.push(`    // ${pinDef.name}: ${assignment.label || capDef.label} (${capDef.label})`);
    if (capDef.kind === "gpio_output" || capDef.kind === "pwm") out.push(`    pinMode(${pinExpr}, OUTPUT);`);
    else if (capDef.kind === "gpio_input") out.push(`    pinMode(${pinExpr}, INPUT);`);
  }
  out.push("}", "");
  return out.join("\n");
}

function genEspIdfInit(items: { assignment: PinAssignment; pinDef: McuPin; capDef: PinCapability }[]): string {
  const out = [
    "// init.c - generated by UCP Pin Planner",
    '#include "driver/gpio.h"',
    "",
    "void pin_planner_init(void) {",
  ];
  for (const { assignment, pinDef, capDef } of items) {
    if (pinDef.espGpio == null) continue;
    out.push(`    // ${pinDef.name}: ${assignment.label || capDef.label} (${capDef.label})`);
    if (capDef.kind === "gpio_output" || capDef.kind === "pwm") out.push(`    gpio_set_direction(GPIO_NUM_${pinDef.espGpio}, GPIO_MODE_OUTPUT);`);
    else if (capDef.kind === "gpio_input") out.push(`    gpio_set_direction(GPIO_NUM_${pinDef.espGpio}, GPIO_MODE_INPUT);`);
    else out.push(`    // Configure ${capDef.label} with the ${capDef.peripheral ?? "peripheral"} driver on GPIO${pinDef.espGpio}.`);
  }
  out.push("}", "");
  return out.join("\n");
}
