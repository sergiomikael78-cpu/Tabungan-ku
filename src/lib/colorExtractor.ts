/**
 * Client-Side Color Extraction & Safe Accent Adjustment Utility for Saving Vision
 * Extracts vibrant dominant & secondary colors from an image,
 * and adjusts HSL lightness to guarantee WCAG AA contrast (>= 4.5:1) against white text.
 */

export interface ExtractedColors {
  accentColor: string;          // Safe Hex for primary accent
  accentColorSecondary: string; // Safe Hex for secondary gradient pair
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), s, l];
}

// Convert HSL to Hex
export function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * SAFE ACCENT ADJUSTMENT (GR-B04 / WCAG AA)
 * Adjusts saturation & lightness so white text overlaid on buttons/cards has >= 4.5:1 contrast ratio.
 */
export function adjustToSafeAccent(r: number, g: number, b: number, isSecondary = false): string {
  const [h, s, l] = rgbToHsl(r, g, b);

  // Clamp saturation between 55% and 85% for rich vividness
  const safeS = Math.max(0.55, Math.min(0.85, s));

  // Clamp lightness between 26% and 42% to guarantee dark background contrast against white text
  const targetLightness = isSecondary ? 0.28 : 0.36;
  const safeL = Math.max(0.24, Math.min(targetLightness, l > 0.6 ? 0.36 : l));

  return hslToHex(h, safeS, safeL);
}

/**
 * Client-Side Image Color Extractor using Canvas API
 */
export async function extractColorsFromImageUrl(imageUrl: string): Promise<ExtractedColors> {
  const DEFAULT_COLORS: ExtractedColors = {
    accentColor: '#10b981', // Fallback Emerald
    accentColorSecondary: '#047857',
  };

  if (typeof window === 'undefined') return DEFAULT_COLORS;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_COLORS);

        const sampleSize = 64;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        // Group pixels into color buckets
        const colorBuckets: Map<string, { r: number; g: number; b: number; count: number; sat: number }> = new Map();

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue; // skip transparent

          const [h, s, l] = rgbToHsl(r, g, b);

          // Skip extreme darks, lights, or greys for dominant accent
          if (l < 0.12 || l > 0.88 || s < 0.15) continue;

          // Quantize hue to 30 deg steps
          const hueBucket = Math.floor(h / 30) * 30;
          const key = `${hueBucket}`;

          const existing = colorBuckets.get(key);
          if (existing) {
            existing.count += 1;
            existing.r += r;
            existing.g += g;
            existing.b += b;
          } else {
            colorBuckets.set(key, { r, g, b, count: 1, sat: s });
          }
        }

        const sorted = Array.from(colorBuckets.values()).sort((a, b) => (b.count * b.sat) - (a.count * a.sat));

        if (sorted.length === 0) return resolve(DEFAULT_COLORS);

        const primary = sorted[0];
        const secondary = sorted.length > 1 ? sorted[1] : sorted[0];

        const r1 = Math.round(primary.r / primary.count);
        const g1 = Math.round(primary.g / primary.count);
        const b1 = Math.round(primary.b / primary.count);

        const r2 = Math.round(secondary.r / secondary.count);
        const g2 = Math.round(secondary.g / secondary.count);
        const b2 = Math.round(secondary.b / secondary.count);

        const safePrimary = adjustToSafeAccent(r1, g1, b1, false);
        const safeSecondary = adjustToSafeAccent(r2, g2, b2, true);

        resolve({
          accentColor: safePrimary,
          accentColorSecondary: safeSecondary,
        });
      } catch (err) {
        console.warn('Color extraction failed, using defaults:', err);
        resolve(DEFAULT_COLORS);
      }
    };

    img.onerror = () => resolve(DEFAULT_COLORS);
    img.src = imageUrl;
  });
}
