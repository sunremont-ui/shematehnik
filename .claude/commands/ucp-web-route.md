# UCP Web — Routing

Orthogonal wire/trace routing in the web frontend (`platform_app/web/`).

## Schematic wire router — `src/routing.ts`

`routeOrthogonal(a, b, obstacles): Pt[]` — grid A* that returns orthogonal
corner points from `a` to `b` avoiding rectangular `obstacles`.

- Grid step `G=8`px, clearance `PAD=4`, search margin `MARGIN=48`, turn
  penalty `TURN=6` (favours straight runs, fewer bends).
- State = `(cell, direction)` so turns can be penalised; binary-heap A*.
- Endpoints are reconnected with explicit orthogonal lead-in segments
  (the grid snaps ends with ≤G/2 error), then collinear points are
  `simplify()`-ed away. No obstacle path → fallback L-route.

Used by `SchematicView`:
- `bboxOf(comp)` → obstacle rect per component body (not pins).
- `routeWire(a, ap, b, bp, obstacles)` escapes each pin outward by a 20px
  stub, then calls `routeOrthogonal` between the stub ends.
- Paths memoised: `useMemo(() => wires.map(routeWire), [wires, comps, obstacles])`.

## PCB trace router — `src/modules/PcbView.tsx`

Same `routeOrthogonal` A* over footprint bounding boxes (`obstacles`):
each pad escapes outward, then copper traces bend around footprints. The
`path` per ratsnest entry feeds the SVG polyline and the Gerber track
segments. Click a ratsnest airwire to route/rip-up; Route all / Rip up.

## Tuning / extending

- Thicker clearance: raise `PAD`. Straighter wires: raise `TURN`. Faster
  but coarser: raise `G`.
- To make PCB use the A* router too: build obstacles from footprint boxes
  and call `routeOrthogonal` per trace (mind keep-out around pads).
- Perf: A* runs per wire on every project change (incl. drag). It is cheap
  for small boards; if it gets heavy, throttle during drag or cache by
  `(fromPin,toPin,positions)` signature.

## Verify

`npm test` (Vitest `routing.test.ts`: straight, around-obstacle, only-
orthogonal). Visually: open Schematic, draw wires across a component —
the wire must bend around the body, never cross it. See `/ucp-web`.
