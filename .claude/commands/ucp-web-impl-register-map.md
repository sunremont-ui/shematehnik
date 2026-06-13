# UCP Web Implement: Register Map

Phase 17.6 (`platform_app/wiki/roadmap-web.md`): maintain the Register Map module in the Code Generator family.

## Scope

- `platform_app/web/src/design.ts` -- `regMap` store, snapshot/restore, `.ucp` v2 persistence.
- `platform_app/web/src/codegen.ts` -- `genRegisterHeader()` and `genRegisterMarkdown()`.
- `platform_app/web/src/modules/RegisterMapView.tsx` -- React UI for device/base/register/field editing and live previews.
- `platform_app/web/src/codegen.test.ts` -- Vitest vectors for generated C/Markdown.
- `platform_app/web/e2e/smoke.spec.ts` -- module count/open-all list and Register Map smoke.

## Rules

- Keep generated identifiers C-safe and deterministic.
- Preserve numeric intent: base, offset, reset value, bit ranges, access mode.
- Detect or prevent invalid bit ranges in UI and tests when adding validation.
- Markdown output should be readable as firmware documentation, not only a debug dump.
- After changes, update `roadmap-web.md`, `log.md`, `modules/web_frontend.md`, `web/README.md`, `wiki/skills.md`, and `modules/codegen.md`.

## Validation

Run:

```bash
cd platform_app/web
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "Register Map"
```

UI check: open `?module=regmap`; verify register/field editors, C header preview, Markdown preview, and download buttons.
