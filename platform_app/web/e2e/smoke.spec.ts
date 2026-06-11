import { test, expect, type Page } from "@playwright/test";

// Клик по узлу дерева с точным совпадением имени (Schematic ≠ AI Schematic).
const openModule = (page: Page, name: string) =>
  page.locator(".tree-row", { has: page.getByText(name, { exact: true }) }).first().click();

test.describe("UCP web smoke", () => {
  test("shell renders all modules with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/");
    await expect(page.locator(".tree-row")).toHaveCount(25);

    await openModule(page, "CRC Calculator");
    await expect(page.getByRole("button", { name: /Copy 0xCBF43926/ })).toBeVisible();
    await expect(page.locator(".chip", { hasText: /engine:/ })).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("every module opens without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    const names = [
      "Schematic", "Symbol Editor", "Wire Tool", "Netlist", "SPICE", "PCB Layout",
      "3D Editor", "Part Editor", "PID Tuner", "Program System", "Protocol",
      "Sequence Diagram", "Packet Editor", "UART Monitor", "Protocol Analyzer",
      "Code Generator", "CRC Calculator", "LVGL Export", "Arduino Export",
      "Protocol Code Gen", "UI Designer", "AI Schematic", "OTA Flash",
      "Firmware Project", "Agent Runner",
    ];
    for (const n of names) {
      await openModule(page, n);
      await page.waitForTimeout(60);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("SPICE: DC / TRAN / AC analyses run on real netlist", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "SPICE");
    await expect(page.locator(".chip", { hasText: /R\/C\/L/ })).toBeVisible();
    for (const m of ["DC", "TRAN", "AC"]) {
      await page.getByRole("button", { name: m, exact: true }).click();
      await expect(page.locator("canvas")).toBeVisible();
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("3D Editor renders a WebGL canvas (three.js)", async ({ page }) => {
    await page.goto("/");
    await openModule(page, "3D Editor");
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    // three.js WebGLRenderer создаёт canvas ненулевого размера
    const box = await canvas.boundingBox();
    expect(box && box.width).toBeGreaterThan(100);
    await expect(page.getByRole("button", { name: "Export STEP" })).toBeVisible();
  });

  test("CodeGen LVGL reflects UI Designer widgets", async ({ page }) => {
    await page.goto("/");
    await openModule(page, "UI Designer");
    await page.getByRole("button", { name: "Switch", exact: true }).click(); // добавить виджет
    await openModule(page, "LVGL Export");
    await expect(page.locator("pre.code")).toContainText("lv_switch_create");
    await expect(page.locator(".chip", { hasText: /widgets из UI Designer/ })).toBeVisible();
  });

  test("UART Monitor: sim fallback streams data, serial connect bar renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "UART Monitor");
    // строка отправки и переключатель baud есть всегда
    await expect(page.getByPlaceholder("send…")).toBeVisible();
    await expect(page.locator("select").filter({ hasText: "115200" })).toBeVisible();
    // симуляция работает без Web Serial
    await page.getByRole("button", { name: "Simulate" }).click();
    await expect(page.locator(".chip", { hasText: "симуляция" })).toBeVisible();
    await expect(page.locator("pre.code")).toContainText("RX", { timeout: 3000 });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("PID Tuner: Sim/Live toggle, live panel renders without port", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "PID Tuner");
    await page.getByRole("button", { name: "Live", exact: true }).click();
    await expect(page.locator(".card", { hasText: "LIVE — Web Serial" })).toBeVisible();
    await page.getByRole("button", { name: "Sim", exact: true }).click();
    await expect(page.locator(".card", { hasText: "GAINS" })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("cross-module data flow: Schematic -> Netlist", async ({ page }) => {
    await page.goto("/");
    await openModule(page, "Netlist");
    const before = await page.locator(".chip", { hasText: /comps/ }).innerText();

    await openModule(page, "Schematic");
    await page.getByRole("button", { name: /Resistor/ }).first().click();

    await openModule(page, "Netlist");
    const after = await page.locator(".chip", { hasText: /comps/ }).innerText();
    expect(after).not.toEqual(before);
  });
});
