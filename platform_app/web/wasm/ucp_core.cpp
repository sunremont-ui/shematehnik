#include "ucp_core.hpp"
#include <algorithm>
#include <cmath>
#include <functional>
#include <numeric>
#include <unordered_map>

namespace ucp {

static uint32_t reflect(uint32_t v, int bits) {
    uint32_t r = 0;
    for (int i = 0; i < bits; i++) { r = (r << 1) | (v & 1u); v >>= 1; }
    return r;
}

uint32_t crc_compute(const uint8_t* data, size_t len, const CrcAlgo& a) {
    const uint32_t topbit = 1u << (a.bits - 1);
    const uint32_t mask   = (a.bits == 32) ? 0xFFFFFFFFu : ((1u << a.bits) - 1u);
    uint32_t crc = a.init & mask;

    for (size_t i = 0; i < len; i++) {
        uint8_t b = a.refIn ? static_cast<uint8_t>(reflect(data[i], 8)) : data[i];
        crc ^= static_cast<uint32_t>(b) << (a.bits - 8);
        for (int k = 0; k < 8; k++)
            crc = (crc & topbit) ? ((crc << 1) ^ a.poly) : (crc << 1);
        crc &= mask;
    }
    if (a.refOut) crc = reflect(crc, a.bits);
    return (crc ^ a.xorOut) & mask;
}

std::vector<double> pid_step(double kp, double ki, double kd,
                             double setpoint, int steps) {
    const double dt = 0.1, tau = 2.0, gain = 1.0;
    double y = 0, integral = 0, prevErr = 0;
    std::vector<double> out;
    out.reserve(static_cast<size_t>(std::max(0, steps)));
    for (int i = 0; i < steps; i++) {
        double err = setpoint - y;
        integral += err * dt;
        double deriv = (err - prevErr) / dt;
        double u = kp * err + ki * integral + kd * deriv;
        u = std::max(-200.0, std::min(200.0, u));
        prevErr = err;
        y += (dt / tau) * (gain * u - y);
        out.push_back(y);
    }
    return out;
}

std::vector<double> rc_lowpass(double r, double c, double vinAmp,
                               double freqHz, double tEnd, int steps) {
    std::vector<double> out;
    if (steps <= 0) return out;
    out.reserve(static_cast<size_t>(steps));
    const double rc = std::max(1e-12, r * c);
    const double dt = tEnd / steps;
    const double w  = 2.0 * M_PI * freqHz;
    double vout = 0.0;
    for (int i = 0; i < steps; i++) {
        double t   = i * dt;
        double vin = vinAmp * std::sin(w * t);
        vout += dt * (vin - vout) / rc;   // Euler step
        out.push_back(vout);
    }
    return out;
}

std::vector<int> connected_components(int n, const std::vector<int>& edges) {
    std::vector<int> parent(std::max(0, n));
    std::iota(parent.begin(), parent.end(), 0);
    std::function<int(int)> find = [&](int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    };
    for (size_t i = 0; i + 1 < edges.size(); i += 2) {
        int a = edges[i], b = edges[i + 1];
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        parent[find(a)] = find(b);
    }
    // Нормализуем id цепей в порядке первого появления.
    std::unordered_map<int, int> label;
    std::vector<int> out(static_cast<size_t>(n));
    for (int i = 0; i < n; i++) {
        int root = find(i);
        auto it = label.find(root);
        if (it == label.end()) { int id = static_cast<int>(label.size()); label[root] = id; out[i] = id; }
        else out[i] = it->second;
    }
    return out;
}

} // namespace ucp
