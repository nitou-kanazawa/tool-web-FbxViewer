import type { Texture } from 'three';
import { drawTextureImage } from '../../../infra/textureImage';
import type { detectUvOverlap, extractUvLayout } from '../../../logic/uvLayout';

/** 0〜1 の外側も少し見えるようにする余白（UV 単位） */
export const UV_PAD = 0.1;

/** UV レイアウトを Canvas に描く。範囲外は赤、重なりは橙で塗る。 */
export function drawUv(
  ctx: CanvasRenderingContext2D,
  size: number,
  layout: ReturnType<typeof extractUvLayout>,
  overlap: ReturnType<typeof detectUvOverlap> | null,
  texture: Texture | null,
  options: { showOverlap: boolean; dark: boolean },
) {
  const scale = size / (1 + UV_PAD * 2);
  const toX = (u: number) => (u + UV_PAD) * scale;
  const toY = (v: number) => (1 - v + UV_PAD) * scale;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = options.dark ? '#1e1e1e' : '#f3f3f3';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = options.dark ? '#2d2d2d' : '#ffffff';
  ctx.fillRect(toX(0), toY(1), scale, scale);
  // 0.1 ごとの目盛り
  ctx.strokeStyle = options.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 10; i++) {
    ctx.moveTo(toX(i / 10), toY(0));
    ctx.lineTo(toX(i / 10), toY(1));
    ctx.moveTo(toX(0), toY(i / 10));
    ctx.lineTo(toX(1), toY(i / 10));
  }
  ctx.stroke();
  if (texture) {
    ctx.globalAlpha = 0.85;
    drawTextureImage(ctx, texture, toX(0), toY(1), scale, scale);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#007acc';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(toX(0), toY(1), scale, scale);
  if (!layout) return;

  const tri = layout.triangles;
  const fill = (indices: number[], color: string) => {
    ctx.fillStyle = color;
    for (const t of indices) {
      ctx.beginPath();
      ctx.moveTo(toX(tri[t * 6]), toY(tri[t * 6 + 1]));
      ctx.lineTo(toX(tri[t * 6 + 2]), toY(tri[t * 6 + 3]));
      ctx.lineTo(toX(tri[t * 6 + 4]), toY(tri[t * 6 + 5]));
      ctx.closePath();
      ctx.fill();
    }
  };
  if (options.showOverlap && overlap) fill(overlap.overlappingTriangles, 'rgba(249,115,22,0.35)');
  fill(layout.outOfRange, 'rgba(241,76,76,0.45)');

  ctx.strokeStyle = options.dark || texture ? 'rgba(255,255,255,0.85)' : 'rgba(30,30,30,0.75)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  for (let t = 0; t < layout.triangleCount; t++) {
    ctx.moveTo(toX(tri[t * 6]), toY(tri[t * 6 + 1]));
    ctx.lineTo(toX(tri[t * 6 + 2]), toY(tri[t * 6 + 3]));
    ctx.lineTo(toX(tri[t * 6 + 4]), toY(tri[t * 6 + 5]));
    ctx.closePath();
  }
  ctx.stroke();
}
