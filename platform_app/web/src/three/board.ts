// ============================================================
// Построение реального 3D-меша платы с компонентами (three.js).
// Схемные координаты (x,y) → плоскость XZ, высота корпуса → Y.
// groupTriangles() извлекает мировые треугольники для STL/STEP-экспорта.
// ============================================================
import * as THREE from "three";
import type { SchComponent } from "../project.ts";

interface Body { w: number; d: number; h: number; color: number; }
function bodyOf(kind: string): Body {
  if (kind === "U") return { w: 34, d: 34, h: 14, color: 0x3a4a6a };
  if (kind === "C") return { w: 16, d: 16, h: 16, color: 0x6a5a2a };
  if (kind === "Q") return { w: 14, d: 18, h: 12, color: 0x444444 };
  return { w: 22, d: 10, h: 8, color: 0x7a7a7a }; // R/L/D
}

export interface BoardBounds { cx: number; cy: number; w: number; d: number; }

export function boardBounds(comps: SchComponent[]): BoardBounds {
  const xs = comps.map((c) => c.x), ys = comps.map((c) => c.y);
  const minX = Math.min(120, ...xs) - 40, maxX = Math.max(360, ...xs) + 40;
  const minY = Math.min(80, ...ys) - 40, maxY = Math.max(300, ...ys) + 40;
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, d: maxY - minY };
}

// Группа: плата (FR4) + корпуса компонентов + опц. рамка-корпус.
export function buildBoardGroup(comps: SchComponent[], enclosure: boolean): THREE.Group {
  const g = new THREE.Group();
  const b = boardBounds(comps);
  const T = 3; // толщина платы

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(b.w, T, b.d),
    new THREE.MeshStandardMaterial({ color: 0x15402a, roughness: 0.85, metalness: 0.1 }),
  );
  board.position.set(0, 0, 0);
  g.add(board);

  for (const c of comps) {
    const body = bodyOf(c.kind);
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(body.w, body.h, body.d),
      new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.6, metalness: 0.2 }),
    );
    m.position.set(c.x - b.cx, T / 2 + body.h / 2, c.y - b.cy);
    g.add(m);
  }

  if (enclosure) {
    const eh = 30;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 8, eh, b.d + 8),
      new THREE.MeshStandardMaterial({ color: 0x78a0dc, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    );
    wall.position.set(0, eh / 2 - T / 2, 0);
    g.add(wall);
  }
  return g;
}

// Извлечь мировые треугольники (по 9 чисел) из всех мешей объекта.
export function groupTriangles(obj: THREE.Object3D): number[] {
  const out: number[] = [];
  obj.updateMatrixWorld(true);
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    // пропускаем полупрозрачный корпус из экспорта
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat && mat.transparent) return;
    let geo = mesh.geometry as THREE.BufferGeometry;
    if (geo.index) geo = geo.toNonIndexed();
    const pos = geo.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      out.push(v.x, v.y, v.z);
    }
  });
  return out;
}

// Треугольники из плоского массива csg() (уже мировые, 9/треуг.) — passthrough.
export function flatTriangles(tris: number[]): number[] { return tris.slice(); }
