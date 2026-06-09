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

  test("cross-module data flow: Schematic -> Netlist", async ({ page }) => {
    await page.goto("/");
    await openModule(page, "Netlist");
    const before = await page.locator(".chip", { hasText: /comps/ }).innerText();

    await openModule(page, "Schematic");
    await page.getByRole("button", { name: /Resistor/ }).click();

    await openModule(page, "Netlist");
    const after = await page.locator(".chip", { hasText: /comps/ }).innerText();
    expect(after).not.toEqual(before);
  });
});
