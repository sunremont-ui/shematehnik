# UCP Web Implement: PCB Clearance DRC

Phase 12.1 (`wiki/roadmap-web.md`). Current web `runDrc` (in `src/project.ts`)
only finds dangling pins/nets. Add geometric clearance checks over the routed
tracks. (Не путать с десктопным `/ucp-impl-pcb-drc` — тот про Qt.)

## Target files

- `platform_app/web/src/project.ts` (или новый `src/drc.ts`, если runDrc разрастётся) — checks
- `platform_app/web/src/modules/PcbView.tsx` — violations list + маркеры на плате

## Checks

Tracks are orthogonal polylines per layer (F.Cu/B.Cu) produced by the A* router;
pads come from footprints. Clearance default 0.2 mm (8px grid ≈ выбери константу
согласованно с роутером в `src/routing.ts`).

```
1. Track–track (same layer, different nets): min distance between segments < clearance
   → "Clearance F.Cu: NET1–NET2 at (x,y), 0.12mm < 0.2mm"
2. Track–pad (different nets): segment-to-rect distance < clearance
3. Pad–pad (different nets): rect-to-rect distance < clearance
4. Track width < min (if width is configurable; otherwise skip with a note)
5. Via–track/pad clearance on both layers
```

Segment–segment distance: project endpoints, axis-aligned fast path (segments are
orthogonal). Keep it O(n²) with bbox prefilter — boards are small.

## UI

- DRC panel: table Type | Net(s) | Location | Value; click row → подсветить
  маркер (красный кружок) на канвасе платы.
- Severity: error (short/clearance) vs warning (dangling — existing).

## Vitest

- Two parallel tracks 0.1mm apart, different nets → violation; same net → none
- Track passing near a pad of another net → violation
- Clean board (existing demo project) → 0 errors

## After implementing

Tick 12.1 in `wiki/roadmap-web.md`, log entry, `/ucp-web`, commit.
