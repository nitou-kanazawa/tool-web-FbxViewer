import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mesh, MeshBasicMaterial, Texture } from 'three';
import { drawTextureImage } from '../../infra/textureImage';
import { formatNumber } from '../../logic/format';
import { materialsOf } from '../../logic/modelStats';
import { detectUvOverlap, extractUvLayout, type UvSet } from '../../logic/uvLayout';
import { useViewerStore } from '../../store/viewerStore';
import { Button, EmptyState, Section, Select, Toggle } from '../common/controls';

const CANVAS_SIZE = 512;
/** 0〜1 の外側も少し見えるようにする余白（UV 単位） */
const PAD = 0.1;

export function UvPanel() {
  const model = useViewerStore((s) => s.model);
  const textures = useViewerStore((s) => s.textures);
  const shading = useViewerStore((s) => s.shading);
  const setView = useViewerStore((s) => s.setView);
  const [meshIndex, setMeshIndex] = useState(0);
  const [uvSet, setUvSet] = useState<UvSet>('uv');
  const [showTexture, setShowTexture] = useState(true);
  const [showOverlap, setShowOverlap] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const meshes = useMemo(() => {
    const list: Mesh[] = [];
    model?.root.traverse((o) => {
      if ((o as Mesh).isMesh && !o.name.startsWith('__')) list.push(o as Mesh);
    });
    return list;
  }, [model]);

  useEffect(() => {
    setMeshIndex(0);
    setUvSet('uv');
  }, [model]);

  const mesh = meshes[meshIndex] ?? null;
  const hasUv1 = !!mesh?.geometry.getAttribute('uv1');
  const layout = useMemo(
    () => (mesh ? extractUvLayout(mesh.geometry, uvSet) : null),
    [mesh, uvSet],
  );
  const overlap = useMemo(() => (layout ? detectUvOverlap(layout, 256) : null), [layout]);
  const texture = useMemo(() => {
    if (!mesh) return null;
    const m = materialsOf(mesh)[0] as MeshBasicMaterial | undefined;
    return (m?.map as Texture | null | undefined) ?? null;
  }, [mesh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawUv(ctx, layout, overlap, showTexture ? texture : null, showOverlap);
  }, [layout, overlap, texture, showTexture, showOverlap, textures]);

  if (!model) return <EmptyState>FBX を読み込むと、UV レイアウトが表示されます。</EmptyState>;
  if (meshes.length === 0) return <EmptyState>メッシュがありません。</EmptyState>;

  const savePng = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mesh?.name || 'mesh'}_${uvSet}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const overlapPercent =
    overlap && overlap.coveredCells > 0 ? (overlap.overlapCells / overlap.coveredCells) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="メッシュ"
          value={String(meshIndex)}
          onChange={(v) => setMeshIndex(Number(v))}
          options={meshes.map((m, i) => ({
            value: String(i),
            label: m.name || `(名前なし ${i + 1})`,
          }))}
          testId="uv-mesh-select"
        />
        <Select
          label="UV セット"
          value={uvSet}
          onChange={(v) => setUvSet(v as UvSet)}
          options={[
            { value: 'uv', label: 'UV0' },
            ...(hasUv1 ? [{ value: 'uv1', label: 'UV1' }] : []),
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Toggle label="テクスチャを重ねる" checked={showTexture} onChange={setShowTexture} />
        <Toggle label="重なりを強調" checked={showOverlap} onChange={setShowOverlap} />
      </div>
      {layout ? (
        <>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            role="img"
            aria-label="UV レイアウト"
            data-testid="uv-canvas"
            className="w-full rounded border border-slate-200 dark:border-slate-700"
          />
          <ul
            className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400"
            data-testid="uv-stats"
          >
            <li>三角形: {formatNumber(layout.triangleCount)}</li>
            <li>
              0〜1 の範囲外: {formatNumber(layout.outOfRange.length)} 枚
              {layout.outOfRange.length > 0 && '（赤で表示）'}
            </li>
            <li>
              重なり（近似）: {overlapPercent.toFixed(1)}%
              {overlap && overlap.overlappingTriangles.length > 0 && '（橙で表示）'}
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={savePng}>PNG で保存</Button>
            <Button
              active={shading === 'checker'}
              aria-pressed={shading === 'checker'}
              onClick={() => setView({ shading: shading === 'checker' ? 'standard' : 'checker' })}
            >
              3D をチェッカー表示
            </Button>
          </div>
        </>
      ) : (
        <EmptyState>このメッシュには {uvSet === 'uv' ? 'UV0' : 'UV1'} がありません。</EmptyState>
      )}
      <Section title="見方">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          枠線が 0〜1 の範囲です。チェッカー表示では、U が増えるほど赤、V
          が増えるほど緑が強くなるので、UV の向きや歪みを確認できます。
        </p>
      </Section>
    </div>
  );
}

function drawUv(
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof extractUvLayout>,
  overlap: ReturnType<typeof detectUvOverlap> | null,
  texture: Texture | null,
  showOverlap: boolean,
) {
  const S = CANVAS_SIZE;
  const scale = S / (1 + PAD * 2);
  const toX = (u: number) => (u + PAD) * scale;
  const toY = (v: number) => (1 - v + PAD) * scale;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#334155';
  ctx.fillRect(toX(0), toY(1), scale, scale);
  if (texture) {
    ctx.globalAlpha = 0.85;
    drawTextureImage(ctx, texture, toX(0), toY(1), scale, scale);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(toX(0), toY(1), scale, scale);
  if (!layout) return;

  const tri = layout.triangles;
  const fillTriangles = (indices: number[], color: string) => {
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
  if (showOverlap && overlap) fillTriangles(overlap.overlappingTriangles, 'rgba(249,115,22,0.35)');
  fillTriangles(layout.outOfRange, 'rgba(239,68,68,0.45)');

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
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
