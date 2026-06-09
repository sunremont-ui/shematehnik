// ============================================================
// ucp_csg — конструктивная блочная геометрия (CSG) через BSP-дерево.
// Порт алгоритма csg.js на C++17 (зеркало десктопного CSG на BSP).
// ============================================================
#pragma once
#include <vector>

namespace ucp {

// op: 0=union, 1=subtract, 2=intersect. Две AABB-коробки (центр+полуразмер).
// Возвращает плоский список треугольников результата: по 9 double на треугольник.
std::vector<double> csg_boxes(int op,
                              double cx, double cy, double cz, double rx, double ry, double rz,
                              double dx, double dy, double dz, double ex, double ey, double ez);

} // namespace ucp
