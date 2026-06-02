#include "ucp_core.hpp"
#include <algorithm>

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

} // namespace ucp
