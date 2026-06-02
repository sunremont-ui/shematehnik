# PID Tuner

## Overview

Multi-channel PID regulator with real-time graphing and autotuning.

## Architecture

```
PidTunerModule
├── PidChannel "Loop 1"
│   ├── Kp/Ki/Kd sliders
│   ├── PidGraphWidget
│   └── PidCore (algorithm)
├── PidChannel "Loop 2" (addable)
└── ...
```

### PidCore (`modules/pid/pid_core.h`)

Pure C++ algorithm, no Qt. Reusable in embedded firmware.

| Feature | Detail |
|---------|--------|
| P term | `kp * error` |
| I term | `ki * integral` with anti-windup clamping (±50% of output range) |
| D term | `kd * (error - prev_error) / dt` with first-run filter |
| Output clamp | `out_min` / `out_max` |
| Autotune | Ziegler-Nichols: `Kp=0.6*Ku, Ki=2*Kp/Tu, Kd=Kp*Tu/8` |

### PidGraphWidget

QPainter graph with:
- Setpoint (blue dashed), Input (green), Output (orange)
- Grid lines
- Legend
- Auto-scaled Y axis
- Rolling window of 500 points

## Usage

1. Open PID Tuner from Modules menu
2. Adjust Kp/Ki/Kd sliders in real-time
3. Graph updates every 100ms with simulated response
4. Add more loops with "+ Add Loop"
5. Pause/resume all loops globally
