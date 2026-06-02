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

EMSCRIPTEN_BINDINGS(ucp_core) {
    register_vector<double>("VectorDouble");
    function("crc", &crc);
    function("pidStep", &pidStep);
}
