# Slice 09 -- Minimal Panel Child Parents

## Date

2026-06-13

## Goal

Add the smallest useful container hierarchy to UI Designer / LVGL Export: a non-Panel widget can choose a same-screen `Panel` as its parent, and generated LVGL C creates that widget under the panel object instead of under the screen root.

This keeps the exporter deterministic while avoiding a full layout engine or SquareLine compatibility claim.

## Data Model

`UiW` gains:

```ts
parentId?: number
```

Normalization keeps the field only when:

- the child is not a `Panel`;
- the referenced widget exists on the same screen;
- the referenced widget type is `Panel`;
- the parent is not the child itself.

Invalid or stale references are dropped during `.ucp` load/restore normalization. Runtime export also validates the relationship so hand-edited state cannot produce a missing parent symbol.

## UI Workflow

When a selected widget is not a `Panel`, the properties pane shows `Parent panel`:

- `Screen` means no container parent;
- each same-screen `Panel` appears as an option;
- the canvas preview draws child coordinates relative to the selected panel;
- dragging a child keeps its saved `x/y` relative to that panel.

`Panel` widgets remain root-level containers in this slice. Nested panels, auto-layout child reflow and drag/drop-to-container gestures are deferred.

## Generator Contract

Single-screen export:

```c
ui_Panel_1 = lv_obj_create(ui_main);
ui_Label_2 = lv_label_create(ui_Panel_1);
```

Project export uses screen-scoped names:

```c
ui_settings_Panel_2 = lv_obj_create(ui_settings);
ui_settings_Label_3 = lv_label_create(ui_settings_Panel_2);
```

The generator orders object creation so valid panel parents are emitted before their children, even if the design-store array has the child first.

## Tests

- `codegen.test.ts`: single-screen child under panel, including parent-before-child output order.
- `codegen.test.ts`: project export with screen-scoped child under panel.
- `project.test.ts`: `.ucp` v2 round-trip keeps `parentId`.
- `smoke.spec.ts`: UI Designer creates a Panel, assigns a Label to it, and LVGL Export contains `lv_label_create(ui_main_Panel_7)`.

## Deferred

- Nested panels.
- Flex/grid child reflow.
- Responsive profiles.
- Container drag/drop gestures.
- Scroll flags, clipping controls and style inheritance.
- SquareLine project import/export.
