# Simulation Pipeline

## Purpose

The simulation pipeline turns a UCP schematic into analysis data: topology -> netlist -> solver -> plots/export.

## Current Web Flow

1. Schematic components and wires live in `UcpProject`.
2. Netlist uses union-find connectivity over real wires.
3. SPICE view builds solver inputs from schematic topology.
4. `platform_app/web/src/spice.ts` runs deterministic TypeScript MNA solvers.
5. Results render as DC/TRAN/AC tables and plots.

## Supported Analysis Modes

- DC operating point and sweeps.
- TRAN with backward-Euler companion models for C/L.
- AC sweep with complex MNA and Bode magnitude/phase.
- Filter Designer reuses the same `acSweep` path for RC/RLC/active approximations.

## Engine Boundary

The web app has a small WASM core for CRC, PID, union-find, MNA DC baseline and CSG, but the full SPICE path currently lives in TypeScript for determinism and fast tests.

## Tests

Simulation-related coverage lives mainly in:

- `platform_app/web/src/spice.test.ts`;
- `platform_app/web/src/filter.test.ts`;
- project/netlist tests around schematic connectivity.

When adding devices or solver behavior, add numerical tolerance tests and document assumptions in [Web Frontend](../modules/web_frontend.md).
