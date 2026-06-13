# Plugin System

## Current Boundary

The original desktop architecture uses a module factory / registration pattern. The web frontend mirrors the module tree explicitly in TypeScript rather than loading runtime plugins.

## Desktop Side

Desktop module documentation still uses concepts such as:

- `ModuleFactory`;
- `REGISTER_MODULE`;
- parent/child module trees;
- static module linking.

See [Module System](module_system.md) for the core shape.

## Web Side

Current web module registration is static:

- `platform_app/web/src/data/modules.ts` -- `MODULE_TREE`, module ids, hierarchy and search/open-all metadata;
- `platform_app/web/src/modules/index.tsx` -- `ModuleView` dispatch from module id to React view;
- `platform_app/web/src/modules/common.tsx` -- shared module wrappers/components.

Adding a web module means:

1. add the module definition to `MODULE_TREE`;
2. add the React view;
3. wire the id in `ModuleView`;
4. update e2e module count/open-all smoke tests;
5. update wiki/roadmap/log/skills.

## Future Direction

Runtime plugin loading is not part of the current web scope. If it returns to the roadmap, it needs a separate design note covering package format, trust/security, API stability and test fixtures.
