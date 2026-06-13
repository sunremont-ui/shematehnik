---
name: ucp-web-pin-planner
description: Implement, extend, or repair the UCP web Pin Planner module in D:\shemaTehnik\platform_app\web. Use when working on MCU pinout data, pin assignment conflict checks, mini-CubeMX-style UI, generated STM32 HAL / Arduino / ESP-IDF init code, Pin Planner tests, or roadmap/wiki updates for phase 17.2.
---

# UCP Web Pin Planner

Use this skill for the phase 17.2 Pin Planner module.

## Workflow

1. Read the current state:
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/modules/web_frontend.md`
   - `platform_app/web/src/pinplanner.ts`
   - `platform_app/web/src/modules/PinPlannerView.tsx`
   - `platform_app/web/src/data/modules.ts`
   - `platform_app/web/e2e/smoke.spec.ts`
2. Keep the pure logic in `src/pinplanner.ts`.
   - MCU definitions live in `MCU_DEFS`.
   - Conflict checking lives in `validatePinPlan()`.
   - Generated init code lives in `generatePinInit()`.
3. Keep the React view thin.
   - `PinPlannerView.tsx` should select MCU, select a pin, assign one function per pin, show conflicts, render package SVG, and expose copy/download for generated init code.
4. When adding MCU support, add realistic but compact pin data first; do not pretend this is a full CubeMX database.
5. Add Vitest vectors in `src/pinplanner.test.ts` for every non-trivial rule or generator branch.
6. Update:
   - `MODULE_TREE` and `ModuleView` if adding new module ids.
   - `e2e/smoke.spec.ts` module count and open-all list.
   - `wiki/roadmap-web.md`, `wiki/log.md`, `wiki/modules/web_frontend.md`, and `web/README.md`.

## Validation

Run from `platform_app/web`:

```bash
npm.cmd test
npm.cmd run build
```

For UI smoke without the known Playwright webServer hang, use Vite preview plus Chromium/Playwright and verify:

- `?module=pinplanner` opens.
- `h1` is `Pin Planner`.
- `svg[aria-label="MCU pin package"]` exists.
- generated code contains the expected init function.
- `.tree-row` count matches the current `MODULE_COUNT`.

## Notes

- One pin has at most one assignment in the current model.
- GPIO input/output can repeat across pins; alternate peripheral functions with the same id should conflict.
- Incomplete buses are warnings, not errors, unless they duplicate the same unique function.
