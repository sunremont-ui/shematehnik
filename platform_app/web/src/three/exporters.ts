// ============================================================
// Экспорт мешей: STL (binary) и STEP (AP214 triangulated shell).
// Вход — плоский массив треугольников (по 9 чисел: 3 вершины × xyz),
// в мировых координатах. Без внешних библиотек (порт desktop StepWriter).
// ============================================================

function normal(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l] as const;
}

// --- STL binary: 80-байт заголовок + uint32 кол-во + 50 байт/треугольник ---
export function stlBinary(tris: number[]): ArrayBuffer {
  const count = Math.floor(tris.length / 9);
  const buf = new ArrayBuffer(84 + count * 50);
  const dv = new DataView(buf);
  // заголовок: подпись
  const sig = "UCP-Web STL export";
  for (let i = 0; i < sig.length && i < 80; i++) dv.setUint8(i, sig.charCodeAt(i));
  dv.setUint32(80, count, true);
  let o = 84;
  for (let i = 0; i < count * 9; i += 9) {
    const [nx, ny, nz] = normal(tris[i], tris[i + 1], tris[i + 2], tris[i + 3], tris[i + 4], tris[i + 5], tris[i + 6], tris[i + 7], tris[i + 8]);
    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true); o += 12;
    for (let k = 0; k < 9; k++) { dv.setFloat32(o, tris[i + k], true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

// --- STL ASCII (для отладки/тестов) ---
export function stlAscii(tris: number[], name = "ucp"): string {
  const out = [`solid ${name}`];
  for (let i = 0; i + 8 < tris.length; i += 9) {
    const [nx, ny, nz] = normal(tris[i], tris[i + 1], tris[i + 2], tris[i + 3], tris[i + 4], tris[i + 5], tris[i + 6], tris[i + 7], tris[i + 8]);
    out.push(`  facet normal ${nx} ${ny} ${nz}`, "    outer loop");
    for (let k = 0; k < 9; k += 3) out.push(`      vertex ${tris[i + k]} ${tris[i + k + 1]} ${tris[i + k + 2]}`);
    out.push("    endloop", "  endfacet");
  }
  out.push(`endsolid ${name}`);
  return out.join("\n");
}

// --- STEP AP214: список координат + треугольный фейс-сет ---
export function stepAP214(tris: number[], name = "ucp_board"): string {
  // дедупликация вершин
  const key = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const map = new Map<string, number>();
  const pts: [number, number, number][] = [];
  const idx: number[] = [];
  for (let i = 0; i + 8 < tris.length; i += 9) {
    for (let k = 0; k < 9; k += 3) {
      const x = tris[i + k], y = tris[i + k + 1], z = tris[i + k + 2];
      const kk = key(x, y, z);
      let id = map.get(kk);
      if (id == null) { id = pts.length; map.set(kk, id); pts.push([x, y, z]); }
      idx.push(id + 1); // STEP 1-based
    }
  }
  const ts = new Date().toISOString();
  const L: string[] = [];
  L.push("ISO-10303-21;", "HEADER;");
  L.push(`FILE_DESCRIPTION(('UCP-Web triangulated shell'),'2;1');`);
  L.push(`FILE_NAME('${name}.step','${ts}',(''),(''),'UCP-Web','UCP-Web','');`);
  L.push(`FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));`);
  L.push("ENDSEC;", "DATA;");
  // координаты
  const coords = pts.map((p) => `(${p[0]},${p[1]},${p[2]})`).join(",");
  L.push(`#10=COORDINATES_LIST('',${pts.length},(${coords}));`);
  // треугольники (индексы вершин)
  const triList: string[] = [];
  for (let i = 0; i + 2 < idx.length; i += 3) triList.push(`(${idx[i]},${idx[i + 1]},${idx[i + 2]})`);
  L.push(`#11=TRIANGULATED_FACE_SET('',#10,$,${triList.length},(${triList.join(",")}),$);`);
  L.push(`#12=SHELL_BASED_SURFACE_MODEL('',(#11));`);
  L.push("ENDSEC;", "END-ISO-10303-21;");
  return L.join("\n");
}
