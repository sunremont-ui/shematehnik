// ============================================================
// ucp_core — Qt-free вычислительное ядро для WASM-сборки.
// Алгоритмы 1:1 с десктопом (platform_app/modules/...), чтобы
// веб-фронтенд считал теми же формулами, что и нативное приложение.
// ============================================================
#pragma once
#include <cstdint>
#include <cstddef>
#include <vector>

namespace ucp {

// --- CRC (зеркало CrcEngine из modules/codegen/codegen_module.cpp) ---
struct CrcAlgo {
    uint32_t poly;
    uint32_t init;
    uint32_t xorOut;
    bool     refIn;
    bool     refOut;
    int      bits;   // 8 / 16 / 32
};

uint32_t crc_compute(const uint8_t* data, size_t len, const CrcAlgo& a);

// --- PID transient (зеркало PidTunerView.simulate / PidCore) ---
// Объект первого порядка с задержкой: tau*y' + y = gain*u, dt=0.1, tau=2.0.
std::vector<double> pid_step(double kp, double ki, double kd,
                             double setpoint, int steps);

// --- RC low-pass transient (зеркало SPICE-симуляции) ---
// Вход: синус амплитуды vinAmp, частота freqHz. Численное интегрирование
// dVout/dt = (Vin - Vout) / (R*C) методом Эйлера на интервале [0, tEnd].
std::vector<double> rc_lowpass(double r, double c, double vinAmp,
                               double freqHz, double tEnd, int steps);

// --- Netlist: union-find ---
// n узлов (пины), edges — плоский массив пар [a0,b0,a1,b1,...].
// Возвращает нормализованный id цепи для каждого узла [0..n).
std::vector<int> connected_components(int n, const std::vector<int>& edges);

} // namespace ucp
