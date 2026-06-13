// ============================================================
// Конвертация пикселей в формат LVGL-ассета. Чистые функции (Vitest);
// браузерный canvas-декод живёт в UI и вызывает эти хелперы.
// ============================================================
import type { UiAsset } from "./design.ts";

export type Rgb565Asset = { w: number; h: number; format: "rgb565"; data: number[] };

// RGBA (canvas ImageData) → little-endian RGB565 байты (LVGL LV_IMG_CF_TRUE_COLOR).
// rgba: длиной width*height*4 (r,g,b,a по пикселю); альфа игнорируется.
export function rgbaToRgb565(width: number, height: number, rgba: ArrayLike<number>): Rgb565Asset {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const data: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4] & 0xFF, g = rgba[i * 4 + 1] & 0xFF, b = rgba[i * 4 + 2] & 0xFF;
    const v = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    data.push(v & 0xFF, (v >> 8) & 0xFF);
  }
  return { w, h, format: "rgb565", data };
}

// Есть ли у ассета валидные инлайн-пиксели для генерации дескриптора.
export function hasInlinePixels(asset: UiAsset): boolean {
  return asset.format === "rgb565"
    && Number.isFinite(asset.w) && (asset.w ?? 0) >= 1
    && Number.isFinite(asset.h) && (asset.h ?? 0) >= 1
    && Array.isArray(asset.data) && asset.data.length === (asset.w ?? 0) * (asset.h ?? 0) * 2;
}
