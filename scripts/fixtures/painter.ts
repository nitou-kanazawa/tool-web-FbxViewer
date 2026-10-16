/**
 * サンプルのテクスチャを描くための、最小限のラスタ描画（アンチエイリアスつき）。
 * 座標は UV（u: 右向き、v: 上向き。0〜1）で指定する。
 */
import { encodePng } from './pngWriter.ts';
import type { UvRect } from './shapes.ts';

export type Rgb = [number, number, number];

export function hex(h: string): Rgb {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function shade(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** 再現性のある疑似乱数（座標から 0〜1）。布や木目のざらつきに使う。 */
export function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class Painter {
  readonly size: number;
  private readonly data: Float32Array;

  constructor(size: number, background: Rgb = [128, 128, 128]) {
    this.size = size;
    this.data = new Float32Array(size * size * 3);
    for (let i = 0; i < size * size; i++) this.data.set(background, i * 3);
  }

  private blend(x: number, y: number, c: Rgb, a: number) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size || a <= 0) return;
    const i = (y * this.size + x) * 3;
    const k = Math.min(1, a);
    this.data[i] += (c[0] - this.data[i]) * k;
    this.data[i + 1] += (c[1] - this.data[i + 1]) * k;
    this.data[i + 2] += (c[2] - this.data[i + 2]) * k;
  }

  private px(u: number, v: number): [number, number] {
    return [u * this.size, (1 - v) * this.size];
  }

  /** UV の矩形を、ローカル座標（lu, lv: 0〜1）から色を返す関数で塗る。 */
  fillRect(rect: UvRect, color: (lu: number, lv: number, x: number, y: number) => Rgb) {
    const [u0, v0, u1, v1] = rect;
    const [x0, y1] = this.px(u0, v0);
    const [x1, y0] = this.px(u1, v1);
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const lu = (x + 0.5 - x0) / (x1 - x0);
        const lv = 1 - (y + 0.5 - y0) / (y1 - y0);
        this.blend(x, y, color(lu, lv, x, y), 1);
      }
    }
  }

  /** 矩形のローカル座標で楕円を塗る（縁はなめらかに）。 */
  ellipse(rect: UvRect, lu: number, lv: number, ru: number, rv: number, color: Rgb, alpha = 1) {
    const [u0, v0, u1, v1] = rect;
    const cu = u0 + (u1 - u0) * lu;
    const cv = v0 + (v1 - v0) * lv;
    const [cx, cy] = this.px(cu, cv);
    const rx = ru * (u1 - u0) * this.size;
    const ry = rv * (v1 - v0) * this.size;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        // 境界から 1 ピクセルぶんで不透明度を落とす
        const edge = (1 - d) * Math.min(rx, ry);
        this.blend(x, y, color, alpha * Math.max(0, Math.min(1, edge + 0.5)));
      }
    }
  }

  /** 矩形のローカル座標で太さのある線を引く。 */
  line(
    rect: UvRect,
    a: [number, number],
    b: [number, number],
    width: number,
    color: Rgb,
    alpha = 1,
  ) {
    const steps = 64;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      this.ellipse(
        rect,
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        width,
        width * ((rect[2] - rect[0]) / (rect[3] - rect[1])),
        color,
        alpha,
      );
    }
  }

  png(): Uint8Array {
    const rgba = new Uint8Array(this.size * this.size * 4);
    for (let i = 0; i < this.size * this.size; i++) {
      rgba[i * 4] = clamp(this.data[i * 3]);
      rgba[i * 4 + 1] = clamp(this.data[i * 3 + 1]);
      rgba[i * 4 + 2] = clamp(this.data[i * 3 + 2]);
      rgba[i * 4 + 3] = 255;
    }
    return encodePng(this.size, this.size, rgba);
  }
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
