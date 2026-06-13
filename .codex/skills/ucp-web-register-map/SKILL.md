---
name: ucp-web-register-map
description: Implement, extend, or repair the UCP web Register Map module in D:\shemaTehnik\platform_app\web. Use when working on register/bitfield data, regMap design-store persistence, C header generation, Markdown register documentation, Register Map UI, Vitest vectors, Playwright smoke tests, or roadmap/wiki updates for phase 17.6.
---

# UCP Web Register Map

Use this skill for the phase 17.6 Register Map module.

## Workflow

1. Read the current state:
   - `platform_app/wiki/roadmap-web.md`
   - `platform_app/wiki/modules/codegen.md`
   - `platform_app/wiki/modules/web_frontend.md`
   - `platform_app/web/src/design.ts`
   - `platform_app/web/src/codegen.ts`
   - `platform_app/web/src/modules/RegisterMapView.tsx`
   - `platform_app/web/e2e/smoke.spec.ts`
2. Keep persistence in `src/design.ts`.
   - `regMap` must survive `.ucp` v2 snapshot/restore.
   - Normalization should reject or repair invalid shapes predictably.
3. Keep generated artifacts in `src/codegen.ts`.
   - `genRegisterHeader()` should emit C-safe names, base/offset/address defines, masks/shifts, and inline helpers.
   - `genRegisterMarkdown()` should be useful as firmware documentation.
4. Keep the React view focused on editing and previewing.
   - Register/field rows, access/reset/base values, live C preview, live Markdown preview, and downloads should stay in sync.
5. Add or update Vitest vectors in `src/codegen.test.ts` for every generator branch.
6. Update:
   - `MODULE_TREE`, `ModuleKind`, and `ModuleView` if adding module ids.
   - `e2e/smoke.spec.ts` module count, open-all list, and Register Map smoke.
   - `wiki/roadmap-web.md`, `wiki/log.md`, `wiki/modules/web_frontend.md`, `web/README.md`, `wiki/modules/codegen.md`, and `wiki/skills.md`.

## Validation

Run from `platform_app/web`:

```bash
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- --grep "Register Map"
```

For manual UI smoke, open `?module=regmap` and verify:

- `h1` is `Register Map`.
- register and bitfield editors render.
- C header preview includes masks and inline helpers.
- Markdown preview includes register/field tables.
- `.h` and `.md` downloads are visible.

## Notes

- Access mode (`ro`, `rw`, `wo`) should affect documentation at minimum; if it affects helpers later, test the behavior.
- Bit numbering must be explicit and stable. Avoid hidden endian assumptions in generated names.
