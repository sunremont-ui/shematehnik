# Slice 07 -- Minimal Panel Flex Layout

## Date

2026-06-13

## Goal

Add the smallest persisted layout marker for UI Designer containers and prove that LVGL export can emit deterministic v8 flex setup calls.

This slice intentionally does not introduce a child hierarchy, auto-placement, constraints, breakpoints or a full responsive layout engine.

## Data Model

`UiW` now accepts optional layout metadata:

```ts
layout?: {
  kind: "flex_row" | "flex_column";
  gap?: number;
}
```

The field is normalized through the persisted `uiProject` path. Unknown layout kinds are dropped, and `gap` is rounded and clamped to zero or greater.

## UI Workflow

Selected `Panel` widgets expose:

- `Layout`: `None`, `Flex row`, `Flex column`;
- `Gap`: numeric spacing value, enabled only when layout is set.

The canvas remains a flat positioning editor in this slice. The layout metadata is primarily an export affordance and a future bridge toward real container children.

## LVGL Output

For widgets with layout metadata, the v8 generator emits:

```c
lv_obj_set_layout(widget, LV_LAYOUT_FLEX);
lv_obj_set_flex_flow(widget, LV_FLEX_FLOW_ROW);
lv_obj_set_style_pad_row(widget, gap, LV_PART_MAIN | LV_STATE_DEFAULT);
lv_obj_set_style_pad_column(widget, gap, LV_PART_MAIN | LV_STATE_DEFAULT);
```

`flex_column` maps to `LV_FLEX_FLOW_COLUMN`.

## Acceptance Criteria

- No-layout golden output remains unchanged.
- `genLvgl()` emits flex layout setup for a single-screen Panel fixture.
- `genLvglProject()` emits screen-scoped flex layout setup for multi-screen output.
- `.ucp` v2 preserves `layout` metadata through `uiProject`.
- UI Designer -> LVGL Export smoke covers a Panel with `flex_row` and `gap`.

## Deferred

- parent/child widget hierarchy;
- drag/drop into containers;
- flex alignment, wrapping and grow/shrink metadata;
- grid layout;
- responsive display profiles;
- LVGL v9 naming mode;
- SquareLine project compatibility.
