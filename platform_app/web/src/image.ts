// ============================================================
// Конвертация пикселей в формат LVGL-ассета. Чистые функции (Vitest);
// браузерный canvas-декод живёт в UI и вызывает эти хелперы.
// ============================================================
import type { UiAsset, UiAssetFormat } from "./design.ts";

export type PixelAsset = { w: number; h: number; format: UiAssetFormat; data: number[] };

// Байты на пиксель для формата ассета (0 — формат без инлайн-пикселей).
export function bytesPerPixel(format: UiAssetFormat | undefined): number {
  return format === "rgb565a8" ? 3 : format === "rgb565" ? 2 : 0;
}

// RGBA (canvas ImageData) → little-endian RGB565 байты (LVGL LV_IMG_CF_TRUE_COLOR).
// rgba: длиной width*height*4 (r,g,b,a по пикселю); альфа игнорируется.
export function rgbaToRgb565(width: number, height: number, rgba: ArrayLike<number>): PixelAsset {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const data: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4] & 0xFF, g = rgba[i * 4 + 1] & 0xFF, b = rgba[i * 4 + 2] & 0xFF;
    const v = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    data.push(v & 0xFF, (v >> 8) & 0xFF);
  }
  return { w, h, format: "rgb565", data };
}

// Как rgbaToRgb565, но с альфа-байтом (LVGL LV_IMG_CF_TRUE_COLOR_ALPHA): 3 байта/пиксель.
export function rgbaToRgb565a8(width: number, height: number, rgba: ArrayLike<number>): PixelAsset {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const data: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4] & 0xFF, g = rgba[i * 4 + 1] & 0xFF, b = rgba[i * 4 + 2] & 0xFF, a = rgba[i * 4 + 3] & 0xFF;
    const v = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    data.push(v & 0xFF, (v >> 8) & 0xFF, a);
  }
  return { w, h, format: "rgb565a8", data };
}

// Есть ли у ассета валидные инлайн-пиксели для генерации дескриптора.
export function hasInlinePixels(asset: UiAsset): boolean {
  const bpp = bytesPerPixel(asset.format);
  return bpp > 0
    && Number.isFinite(asset.w) && (asset.w ?? 0) >= 1
    && Number.isFinite(asset.h) && (asset.h ?? 0) >= 1
    && Array.isArray(asset.data) && asset.data.length === (asset.w ?? 0) * (asset.h ?? 0) * bpp;
}
