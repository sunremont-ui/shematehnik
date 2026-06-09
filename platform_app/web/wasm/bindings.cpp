// ============================================================
// Emscripten embind: экспорт ucp_core в JS/TS.
// Собирается в src/core/generated/ucp_core.{js,wasm} (ES-модуль).
// ============================================================
#include "ucp_core.hpp"
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

// CRC: принимает Uint8Array или number[], параметры алгоритма явно.
static uint32_t crc(val bytes, uint32_t poly, uint32_t init,
                    bool refIn, bool refOut, uint32_t xorOut, int bits) {
    std::vector<uint8_t> v = convertJSArrayToNumberVector<uint8_t>(bytes);
    return ucp::crc_compute(v.data(), v.size(),
                            {poly, init, xorOut, refIn, refOut, bits});
}

static std::vector<double> pidStep(double kp, double ki, double kd,
                                   double setpoint, int steps) {
    return ucp::pid_step(kp, ki, kd, setpoint, steps);
}

static std::vector<double> rcLowpass(double r, double c, double vinAmp,
                                     double freqHz, double tEnd, int steps) {
    return ucp::rc_lowpass(r, c, vinAmp, freqHz, tEnd, steps);
}

static std::vector<int> connectedComponents(int n, val edges) {
    std::vector<int> e = convertJSArrayToNumberVector<int>(edges);
    return ucp::connected_components(n, e);
}

EMSCRIPTEN_BINDINGS(ucp_core) {
    register_vector<double>("VectorDouble");
    register_vector<int>("VectorInt");
    function("crc", &crc);
    function("pidStep", &pidStep);
    function("rcLowpass", &rcLowpass);
    function("connectedComponents", &connectedComponents);
}
