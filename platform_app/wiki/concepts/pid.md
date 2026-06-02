# PID Control

## Algorithm

The `PidCore` implements the standard parallel PID formula:

```
output = Kp * error + Ki * integral + Kd * derivative

where:
  error = setpoint - input
  integral += error * dt
  derivative = (error - prev_error) / dt
```

### Anti-windup

Integral term clamped to ±50% of output range to prevent integral windup when the actuator saturates:

```
if integral > integral_limit: integral = integral_limit
if integral < -integral_limit: integral = -integral_limit
```

### Derivative kick avoidance

On first `compute()` call, the derivative term is set to zero to avoid a spike from the initial error step.

### Ziegler-Nichols Autotuning

1. Set Ki=0, Kd=0
2. Increase Kp until the system oscillates at constant amplitude (Ku = critical gain)
3. Measure oscillation period Tu
4. Apply:

```
Kp = 0.6 * Ku
Ki = 2 * Kp / Tu
Kd = Kp * Tu / 8
```

## Usage in UCP

- Desktop: `PidChannel` wraps `PidCore` with Qt UI (sliders, graph)
- Embedded: `PidCore` can be compiled as-is (C++17, no dependencies)
- Cross-compilation: same `pid_core.h/.cpp` for both desktop and ESP32 firmware
