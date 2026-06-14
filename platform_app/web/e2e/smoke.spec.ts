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
    await expect(page.locator(".tree-row")).toHaveCount(31);

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
      "Schematic", "Symbol Editor", "Wire Tool", "Netlist", "SPICE", "Filter Designer", "PCB Layout",
      "3D Editor", "Part Editor", "PID Tuner", "Program System", "Protocol",
      "Sequence Diagram", "Packet Editor", "UART Monitor", "Protocol Analyzer", "Logic Analyzer",
      "Code Generator", "CRC Calculator", "LVGL Export", "Arduino Export",
      "Protocol Code Gen", "Pin Planner", "EE Calculators", "Power Budget", "Register Map", "UI Designer", "AI Schematic", "OTA Flash",
      "Firmware Project", "Agent Runner",
    ];
    for (const n of names) {
      await openModule(page, n);
      await page.waitForTimeout(60);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("SPICE: DC / SWEEP / TRAN / AC analyses run on real netlist", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "SPICE");
    await expect(page.locator(".chip", { hasText: /R\/C\/L/ })).toBeVisible();
    for (const m of ["DC", "SWEEP", "TRAN", "AC"]) {
      await page.getByRole("button", { name: m, exact: true }).click();
      await expect(page.locator("canvas")).toBeVisible();
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Filter Designer: renders Bode response and export controls", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "Filter Designer");
    await expect(page.locator("svg[aria-label='Bode magnitude response']")).toBeVisible();
    await expect(page.locator(".chip", { hasText: /^fc / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Pin Planner: renders package and generated init", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "Pin Planner");
    await expect(page.locator("svg[aria-label='MCU pin package']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download init.c" })).toBeVisible();
    await expect(page.locator("pre.code")).toContainText("MX_PinPlanner_Init");
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("EE Calculators: renders divider, trace and thermal checks", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "EE Calculators");
    await expect(page.locator("svg[aria-label='Voltage divider ratio']")).toBeVisible();
    await expect(page.locator("svg[aria-label='Trace width cross-section']")).toBeVisible();
    await expect(page.locator("svg[aria-label='LDO thermal headroom']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download report.md" })).toBeVisible();
    await expect(page.locator(".chip", { hasText: /Trace/ })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Logic Analyzer: renders timing canvas and decodes UART/I2C samples", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "Logic Analyzer");
    await expect(page.locator("canvas[aria-label='Logic timing diagram']")).toBeVisible();
    await expect(page.locator(".chip", { hasText: /1 annotations/ })).toBeVisible();
    await expect(page.getByText("UART 0x55")).toBeVisible();
    await page.getByRole("button", { name: "I2C sample" }).click();
    await expect(page.getByText("ADDR 0x50 W ACK")).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Power Budget: groups loads and renders editable rail budgets", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "Power Budget");
    await expect(page.getByRole("button", { name: "Download budget.csv" })).toBeVisible();
    await expect(page.getByLabel("U1 current mA")).toBeVisible();
    await expect(page.locator("svg[aria-label='Unassigned power budget bar']")).toBeVisible();
    await expect(page.locator(".chip", { hasText: /Total/ })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Register Map: renders editor and generated C/Markdown outputs", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "Register Map");
    await expect(page.getByRole("button", { name: "Download .h" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download .md" })).toBeVisible();
    await expect(page.locator("pre.code")).toContainText("#define UCP_PERIPH_CTRL_MODE_Msk");
    await page.getByRole("button", { name: "Markdown" }).click();
    await expect(page.locator("pre.code")).toContainText("# UCP_PERIPH Register Map");
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
    await page.getByRole("button", { name: "+ Screen" }).click();
    await page.getByRole("button", { name: /\* Main/ }).click();
    await page.getByRole("button", { name: "Button", exact: true }).click();
    await page.getByLabel("Event").selectOption("clicked");
    await page.getByLabel("Action").selectOption("screen_load");
    await page.getByLabel("Target screen").selectOption("screen_2");
    await page.getByRole("button", { name: "Switch", exact: true }).click(); // добавить виджет
    await page.getByRole("button", { name: "Image", exact: true }).click();
    await page.getByLabel("Asset id").fill("img_logo");
    await page.getByRole("button", { name: "Panel", exact: true }).click();
    await page.getByLabel("Layout").selectOption("flex_row");
    await page.getByLabel("Gap").fill("4");
    await page.getByLabel(/^Align/).selectOption("space_between");
    await page.getByLabel("Cross").selectOption("center");
    await page.getByRole("button", { name: "Label", exact: true }).click();
    await page.getByLabel("Parent panel").selectOption("7");
    await page.getByLabel("Grow").fill("2");
    await openModule(page, "LVGL Export");
    await expect(page.locator("pre.code")).toContainText("lv_switch_create");
    await expect(page.locator("pre.code")).toContainText("LV_IMG_DECLARE(img_logo)");
    await expect(page.locator("pre.code")).toContainText("lv_img_set_src");
    await expect(page.locator("pre.code")).toContainText("lv_obj_set_layout");
    await expect(page.locator("pre.code")).toContainText("LV_FLEX_FLOW_ROW");
    await expect(page.locator("pre.code")).toContainText("lv_obj_set_flex_align(ui_main_Panel_7, LV_FLEX_ALIGN_SPACE_BETWEEN, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_START);");
    await expect(page.locator("pre.code")).toContainText("ui_main_Label_8 = lv_label_create(ui_main_Panel_7)");
    await expect(page.locator("pre.code")).toContainText("lv_obj_set_flex_grow(ui_main_Label_8, 2);");
    await expect(page.locator("pre.code")).toContainText("lv_scr_load(ui_screen_2)");
    await expect(page.locator(".chip", { hasText: /widgets из UI Designer/ })).toBeVisible();
    // Asset manifest: declare a source for the used image and see the comment.
    await page.getByRole("button", { name: "+ Asset" }).click();
    await page.getByLabel("Asset manifest id").fill("img_logo");
    await page.getByLabel("Asset manifest src").fill("assets/logo.png");
    await expect(page.locator("pre.code")).toContainText("LV_IMG_DECLARE(img_logo); // src: assets/logo.png");
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

  test("OTA Flash: real-flash controls render (file, address, baud)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "OTA Flash");
    await expect(page.locator('input[type="file"][accept=".bin"]')).toBeAttached();
    await expect(page.getByLabel("Flash address (hex)")).toHaveValue("0x10000");
    await expect(page.getByRole("button", { name: /Flash firmware/ })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("PCB: route all -> tracks persist, DRC and pour controls work", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await openModule(page, "PCB Layout");
    await page.getByRole("button", { name: "Route all" }).click();
    await expect(page.locator("polyline")).not.toHaveCount(0);   // дорожка в SVG
    await page.getByRole("button", { name: "Run DRC" }).click();
    await expect(page.locator(".chip", { hasText: "clearance" })).toBeVisible();
    await expect(page.locator(".chip", { hasText: "floating" })).toBeVisible();
    // дорожки в модели → переживают переключение модулей (keep-alive + store)
    await openModule(page, "Schematic");
    await openModule(page, "PCB Layout");
    await expect(page.locator("polyline")).not.toHaveCount(0);
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

  test("cross-module data flow: Packet Editor -> Protocol Analyzer", async ({ page }) => {
    await page.goto("/");
    await openModule(page, "Packet Editor");
    await page.getByRole("button", { name: "Send to Analyzer" }).click();

    await openModule(page, "Protocol Analyzer");
    await page.getByLabel("Source").selectOption("capture");
    await expect(page.locator(".chip", { hasText: /1 packets/ })).toBeVisible();
    await expect(page.getByText("cmd=0x3")).toBeVisible();
    await expect(page.getByText("OK")).toBeVisible();
  });
});
