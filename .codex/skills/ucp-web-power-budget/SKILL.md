---
name: ucp-web-power-budget
description: Implement, extend, or repair the UCP web Power Budget module in D:\shemaTehnik\platform_app\web. Use when working on BOM current estimates, power-net rail grouping, rail budget warnings, CSV export, Power Budget UI, Vitest vectors, Playwright smoke tests, or roadmap/wiki updates for phase 17.5.
---

# UCP Web Power Budget

Use this skill for the phase 17.5 Power Budget module.

## Workflow

1. Read the current state:
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/modules/web_frontend.md`
   - `platform_app/web/src/power.ts`
   - `platform_app/web/src/modules/PowerBudgetView.tsx`
   - `platform_app/web/src/data/modules.ts`
   - `platform_app/web/e2e/smoke.spec.ts`
2. Keep budget math in `src/power.ts`.
   - Default current estimates are heuristics and must stay overrideable.
   - Rail grouping should be based on explicit power-net labels where possible.
   - Overload, low margin, and unassigned loads should be represented in data, not only CSS.
3. Keep the React view thin.
   - `PowerBudgetView.tsx` should expose editable currents, rail limits, summary bars, warnings, and CSV export.
4. Add Vitest vectors in `src/power.test.ts` for every non-trivial grouping/warning/export branch.
5. Update:
   - `MODULE_TREE`, `ModuleKind`, and `ModuleView` if adding module ids.
   - `e2e/smoke.spec.ts` module count, open-all list, and Power Budget smoke.
   - `wiki/roadmap-web.md`, `wiki/log.md`, `wiki/modules/web_frontend.md`, `web/README.md`, `wiki/modules/codegen.md`, and `wiki/skills.md`.

## Validation

Run from `platform_app/web`:

```bash
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "Power Budget"
```

For manual UI smoke, open `?module=powerbudget` and verify:

- `h1` is `Power Budget`.
- load rows and rail budget rows render.
- summary bars reflect total current and margin.
- overload/unassigned warnings are visible when expected.
- `Download budget.csv` is visible.

## Notes

- Do not present estimated current draw as measured data.
- Prefer transparent rail names and user-editable limits over hidden automatic choices.
