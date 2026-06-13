---
name: ucp-web-logic-analyzer
description: Implement, extend, or repair the UCP web Logic Analyzer module in D:\shemaTehnik\platform_app\web. Use when working on VCD/CSV import, timing-channel normalization, UART/I2C/SPI decode, waveform canvas UI, Logic Analyzer tests, Playwright smoke tests, or roadmap/wiki updates for phase 17.4.
---

# UCP Web Logic Analyzer

Use this skill for the phase 17.4 Logic Analyzer module.

## Workflow

1. Read the current state:
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/modules/web_frontend.md`
   - `platform_app/web/src/logic.ts`
   - `platform_app/web/src/modules/LogicAnalyzerView.tsx`
   - `platform_app/web/src/data/modules.ts`
   - `platform_app/web/e2e/smoke.spec.ts`
2. Keep import and decode logic in `src/logic.ts`.
   - CSV/VCD parsing should be deterministic and covered by unit tests.
   - UART/I2C/SPI decoders should expose assumptions through parameters and result metadata.
   - Time formatting should be stable across small and large captures.
3. Keep the React view focused on interaction.
   - Import controls, timing canvas, zoom/pan, cursors, protocol controls, and export should not duplicate parser logic.
4. Add Vitest vectors in `src/logic.test.ts` for every parser/decode branch changed.
5. Update:
   - `MODULE_TREE`, `ModuleKind`, and `ModuleView` if adding module ids.
   - `e2e/smoke.spec.ts` module count, open-all list, and Logic Analyzer smoke.
   - `wiki/roadmap-web.md`, `wiki/log.md`, `wiki/modules/web_frontend.md`, `web/README.md`, and `wiki/skills.md`.

## Validation

Run from `platform_app/web`:

```bash
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "Logic Analyzer"
```

For manual UI smoke, open `?module=logic` and verify:

- `h1` is `Logic Analyzer`.
- waveform canvas is visible and non-empty.
- cursor delta changes when cursors move.
- UART demo decode includes `0x55`.
- annotation CSV export is visible.

## Notes

- VCD support is intentionally compact; expand syntax with tests instead of accepting malformed input silently.
- Protocol decoders should prefer explicit warnings over inferred success when capture settings are incomplete.
