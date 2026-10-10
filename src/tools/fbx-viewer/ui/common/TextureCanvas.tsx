import { useEffect, useRef } from 'react';
import type { Texture } from 'three';
import { drawTextureImage } from '../../infra/textureImage';

/** テクスチャを Canvas に描く。読み込み前なら斜線を描く。 */
export function TextureCanvas({
  texture,
  size,
  missing = false,
  version,
  label,
}: {
  texture: Texture;
  size: number;
  missing?: boolean;
  /** 値が変わると描き直す（テクスチャの読み込み完了の合図） */
  version?: unknown;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, size, size);
    if (missing || !drawTextureImage(ctx, texture, 0, 0, size, size)) {
      ctx.fillStyle = missing ? '#ff00ff' : '#cbd5e1';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      for (let i = -size; i < size; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, size);
        ctx.lineTo(i + size, 0);
        ctx.stroke();
      }
    }
  }, [texture, size, missing, version]);
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700"
      style={{ width: size, height: size, imageRendering: 'auto' }}
    />
  );
}
