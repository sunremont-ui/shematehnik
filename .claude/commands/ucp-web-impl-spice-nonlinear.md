# UCP Web Implement: SPICE 2.0 — Nonlinear Elements

Phase 11 (`wiki/roadmap-web.md`). The library has D/Q parts but `src/spice.ts`
only stamps R/C/L — a schematic with an LED simulates wrong. Add Newton-Raphson
iteration over the existing MNA for diodes, then BJT/MOSFET, plus DC sweep and
plot cursors/CSV.

## Target files

- `platform_app/web/src/spice.ts` — solver (`buildElements`, `dcSolve`, `transient`, `acSweep`)
- `platform_app/web/src/modules/schematic_family.tsx` — SpiceView panel (modes, plot)
- `platform_app/web/src/spice.test.ts` — vectors

## 11.1 Diode (Shockley + NR)

- `buildElements`: kind `D` → `{type:"D", n1(anode), n2(cathode), Is:1e-14, Vt:0.02585, n:1}`.
  LED value → `n:2` (Vf≈1.8–2V plausible without per-part models).
- NR loop around the linear solve (works for DC and each TRAN step):
  companion model — linearize at `Vd0`: `Geq = Is/(n·Vt)·exp(Vd0/(n·Vt))`,
  `Ieq = Id(Vd0) − Geq·Vd0`; stamp Geq as R, Ieq as I-source; iterate until
  `|Vd − Vd0| < 1e-6` (max ~50 iters; limit Vd step to ±0.5V per iter for convergence — voltage limiting is essential).
- AC: linearize at the DC operating point (`Geq` from final NR) → stamp as conductance.

## 11.2 BJT / MOSFET

- BJT (kind `Q`, NPN/PNP from value): Ebers-Moll — two coupled diodes + current
  sources `αF·IF`/`αR·IR` (βF=100, βR=1). Same NR companion pattern.
- MOSFET (value contains "MOS"/2N7000/IRF…): level 1 square-law,
  `Vth=2V, K=0.1`; regions cutoff/linear/saturation; stamp `gm`, `gds`, `Ieq`.
- Pin mapping: Q has 3 pins (`pinsOf("Q")` — check order in `project.ts`; document B/C/E ↔ pin 1/2/3 or G/D/S).

## 11.3 DC sweep + multiple sources

- `dcSweep(src, from, to, steps)` → reuse NR-DC per point; plot V(probe) vs Vsrc.
- Elements: allow several `V`/`I` sources (panel: per-source value list instead of single «возбуждение»).

## 11.4 Plot cursors + CSV

- Canvas plot: two draggable X-cursors, readout `Δt/ΔV` (or `Δf/ΔdB` in AC).
- "Export CSV" button → `downloadText` from `src/util.ts` (`t,v` rows per probe).

## Vitest vectors (add to spice.test.ts)

1. Diode + R divider: Vd ≈ 0.6–0.7 V (Is=1e-14, 5V via 1k)
2. NR convergence: reverse-biased diode → Id ≈ −Is
3. NPN common emitter: Ic ≈ β·Ib region check
4. NMOS saturation: Id = K(Vgs−Vth)²
5. DC sweep monotonic for the diode I-V curve
6. TRAN with diode: half-wave rectifier — negative half suppressed

## After implementing

Tick 11.1–11.4 in `wiki/roadmap-web.md`, log entry in `wiki/log.md`, `/ucp-web`, commit
(можно по пунктам: 11.1+11.3 → коммит, 11.2 → коммит, 11.4 → коммит).
