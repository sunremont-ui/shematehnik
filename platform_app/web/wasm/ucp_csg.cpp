#include "ucp_csg.hpp"
#include <algorithm>
#include <cmath>
#include <memory>

namespace ucp {
namespace {

constexpr double EPS = 1e-5;

struct V3 {
    double x = 0, y = 0, z = 0;
    V3 operator+(const V3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    V3 operator-(const V3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    V3 operator*(double s) const { return {x * s, y * s, z * s}; }
    double dot(const V3& o) const { return x * o.x + y * o.y + z * o.z; }
    V3 cross(const V3& o) const { return {y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x}; }
    V3 unit() const { double l = std::sqrt(dot(*this)); return l > 0 ? *this * (1.0 / l) : *this; }
    V3 lerp(const V3& o, double t) const { return *this + (o - *this) * t; }
};

struct Polygon {
    std::vector<V3> verts;
    V3 normal;
    double w = 0;
    void computePlane() {
        normal = (verts[1] - verts[0]).cross(verts[2] - verts[0]).unit();
        w = normal.dot(verts[0]);
    }
    void flip() {
        std::reverse(verts.begin(), verts.end());
        normal = normal * -1.0; w = -w;
    }
};

enum { COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3 };

// Разрезать полигон плоскостью (normal,w) — классика csg.js.
void splitPolygon(const V3& n, double w, const Polygon& poly,
                  std::vector<Polygon>& coFront, std::vector<Polygon>& coBack,
                  std::vector<Polygon>& front, std::vector<Polygon>& back) {
    int polyType = 0;
    std::vector<int> types;
    types.reserve(poly.verts.size());
    for (const auto& v : poly.verts) {
        double t = n.dot(v) - w;
        int type = (t < -EPS) ? BACK : (t > EPS) ? FRONT : COPLANAR;
        polyType |= type;
        types.push_back(type);
    }
    switch (polyType) {
        case COPLANAR:
            (n.dot(poly.normal) > 0 ? coFront : coBack).push_back(poly);
            break;
        case FRONT: front.push_back(poly); break;
        case BACK:  back.push_back(poly);  break;
        case SPANNING: {
            Polygon f, b;
            for (size_t i = 0; i < poly.verts.size(); i++) {
                size_t j = (i + 1) % poly.verts.size();
                int ti = types[i], tj = types[j];
                const V3& vi = poly.verts[i];
                const V3& vj = poly.verts[j];
                if (ti != BACK) f.verts.push_back(vi);
                if (ti != FRONT) b.verts.push_back(vi);
                if ((ti | tj) == SPANNING) {
                    double t = (w - n.dot(vi)) / n.dot(vj - vi);
                    V3 mid = vi.lerp(vj, t);
                    f.verts.push_back(mid);
                    b.verts.push_back(mid);
                }
            }
            if (f.verts.size() >= 3) { f.computePlane(); front.push_back(f); }
            if (b.verts.size() >= 3) { b.computePlane(); back.push_back(b); }
            break;
        }
    }
}

struct Node {
    bool hasPlane = false;
    V3 normal; double w = 0;
    std::vector<Polygon> polygons;
    std::unique_ptr<Node> front, back;

    void invert() {
        for (auto& p : polygons) p.flip();
        normal = normal * -1.0; w = -w;
        if (front) front->invert();
        if (back) back->invert();
        std::swap(front, back);
    }

    std::vector<Polygon> clipPolygons(const std::vector<Polygon>& polys) const {
        if (!hasPlane) return polys;
        std::vector<Polygon> f, b;
        for (const auto& p : polys)
            splitPolygon(normal, w, p, f, b, f, b);
        std::vector<Polygon> result = front ? front->clipPolygons(f) : f;
        if (back) { auto bb = back->clipPolygons(b); result.insert(result.end(), bb.begin(), bb.end()); }
        return result;
    }

    void clipTo(const Node& bsp) {
        polygons = bsp.clipPolygons(polygons);
        if (front) front->clipTo(bsp);
        if (back) back->clipTo(bsp);
    }

    void allPolygons(std::vector<Polygon>& out) const {
        out.insert(out.end(), polygons.begin(), polygons.end());
        if (front) front->allPolygons(out);
        if (back) back->allPolygons(out);
    }

    void build(const std::vector<Polygon>& polys) {
        if (polys.empty()) return;
        if (!hasPlane) { hasPlane = true; normal = polys[0].normal; w = polys[0].w; }
        std::vector<Polygon> f, b;
        for (const auto& p : polys)
            splitPolygon(normal, w, p, polygons, polygons, f, b);
        if (!f.empty()) { if (!front) front = std::make_unique<Node>(); front->build(f); }
        if (!b.empty()) { if (!back) back = std::make_unique<Node>(); back->build(b); }
    }
};

std::vector<Polygon> nodePolys(std::vector<Polygon> polys, const std::vector<Polygon>& other, int op) {
    Node a, b;
    a.build(polys);
    b.build(other);
    if (op == 0) { // union
        a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert();
    } else if (op == 1) { // subtract
        a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert();
    } else { // intersect
        a.invert(); b.clipTo(a); b.invert(); a.clipTo(b); b.clipTo(a);
    }
    std::vector<Polygon> bp; b.allPolygons(bp);
    a.build(bp);
    if (op != 0) a.invert();
    std::vector<Polygon> out; a.allPolygons(out);
    return out;
}

// Куб (центр c, полуразмер r) → 6 квадратов.
std::vector<Polygon> makeBox(V3 c, V3 r) {
    static const int faces[6][4] = {
        {0,4,6,2}, {1,3,7,5}, {0,1,5,4}, {2,6,7,3}, {0,2,3,1}, {4,5,7,6}
    };
    std::vector<Polygon> polys;
    for (auto& f : faces) {
        Polygon p;
        for (int i = 0; i < 4; i++) {
            int b = f[i];
            p.verts.push_back({
                c.x + r.x * ((b & 1) ? 1 : -1),
                c.y + r.y * ((b & 2) ? 1 : -1),
                c.z + r.z * ((b & 4) ? 1 : -1),
            });
        }
        p.computePlane();
        polys.push_back(p);
    }
    return polys;
}

} // namespace

std::vector<double> csg_boxes(int op,
                              double cx, double cy, double cz, double rx, double ry, double rz,
                              double dx, double dy, double dz, double ex, double ey, double ez) {
    auto a = makeBox({cx, cy, cz}, {rx, ry, rz});
    auto b = makeBox({dx, dy, dz}, {ex, ey, ez});
    auto res = nodePolys(a, b, op);
    std::vector<double> tris;
    for (const auto& p : res) {
        for (size_t i = 1; i + 1 < p.verts.size(); i++) { // веер
            const V3& v0 = p.verts[0]; const V3& v1 = p.verts[i]; const V3& v2 = p.verts[i + 1];
            tris.insert(tris.end(), {v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z});
        }
    }
    return tris;
}

} // namespace ucp
