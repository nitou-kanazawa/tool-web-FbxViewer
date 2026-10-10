import type { Texture } from 'three';

interface DataImage {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

/**
 * テクスチャの画像を Canvas に描く。画像（img / ImageBitmap / canvas）と、
 * TGALoader が返す画素の配列（DataTexture）の両方に対応する。描けたら true。
 */
export function drawTextureImage(
  ctx: CanvasRenderingContext2D,
  texture: Texture,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const image = texture.image as CanvasImageSource | DataImage | null | undefined;
  if (!image) return false;
  if (isDrawable(image)) {
    if (image instanceof HTMLImageElement && !image.complete) return false;
    ctx.drawImage(image, x, y, w, h);
    return true;
  }
  const data = image as DataImage;
  if (!data.data || !data.width || !data.height) return false;
  const tmp = document.createElement('canvas');
  tmp.width = data.width;
  tmp.height = data.height;
  const tctx = tmp.getContext('2d');
  if (!tctx) return false;
  const pixels = new Uint8ClampedArray(data.width * data.height * 4);
  const channels = data.data.length / (data.width * data.height);
  for (let i = 0; i < data.width * data.height; i++) {
    pixels[i * 4] = data.data[i * channels];
    pixels[i * 4 + 1] = data.data[i * channels + (channels > 1 ? 1 : 0)];
    pixels[i * 4 + 2] = data.data[i * channels + (channels > 2 ? 2 : 0)];
    pixels[i * 4 + 3] = channels > 3 ? data.data[i * channels + 3] : 255;
  }
  // DataTexture は下の行から並んでいるので上下を反転して描く
  tctx.putImageData(new ImageData(pixels, data.width, data.height), 0, 0);
  ctx.save();
  ctx.translate(x, y + h);
  ctx.scale(1, -1);
  ctx.drawImage(tmp, 0, 0, w, h);
  ctx.restore();
  return true;
}

function isDrawable(image: unknown): image is CanvasImageSource {
  return (
    (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) ||
    (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas)
  );
}
