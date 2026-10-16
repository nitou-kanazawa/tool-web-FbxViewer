import { Download } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mesh, MeshBasicMaterial, Texture } from 'three';
import { useTheme } from '../../../../../theme/useTheme';
import { formatNumber } from '../../../logic/format';
import { detectUvOverlap, extractUvLayout, type UvSet } from '../../../logic/uvLayout';
import { originalMaterialsOf } from '../../../services/DisplayModeManager';
import { useViewerStore } from '../../../store/viewerStore';
import { IconButton, VsCheckbox, VsSelect } from '../primitives';
import { vsc } from '../styles';
import { Crumbs, EditorToolbar } from './EditorToolbar';
import { drawUv } from './uvDrawing';
import { useElementSize } from './useElementSize';

/** UV エディタ（メッシュごとのタブ）。 */
export function UvEditor({ meshUuid }: { meshUuid: string }) {
  const model = useViewerStore((s) => s.model);
  const textures = useViewerStore((s) => s.textures);
  const { theme } = useTheme();
  const mesh = useMemo(
    () => model?.root.getObjectByProperty('uuid', meshUuid) as Mesh | undefined,
    [model, meshUuid],
  );
  const [uvSet, setUvSet] = useState<UvSet>('uv');
  const [showTexture, setShowTexture] = useState(true);
  const [showOverlap, setShowOverlap] = useState(true);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const area = useElementSize(areaRef);
  const size = Math.max(64, Math.min(area.width, area.height) - 24);

  const layout = useMemo(
    () => (mesh ? extractUvLayout(mesh.geometry, uvSet) : null),
    [mesh, uvSet],
  );
  const overlap = useMemo(() => (layout ? detectUvOverlap(layout, 256) : null), [layout]);
  const texture = useMemo(() => {
    const m = mesh ? (originalMaterialsOf(mesh)[0] as MeshBasicMaterial | undefined) : undefined;
    return (m?.map as Texture | null | undefined) ?? null;
  }, [mesh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawUv(ctx, size, layout, overlap, showTexture ? texture : null, {
      showOverlap,
      dark: theme === 'dark',
    });
  }, [size, layout, overlap, texture, showTexture, showOverlap, textures, theme]);

  if (!mesh)
    return <div className={`p-4 text-[13px] ${vsc.muted}`}>メッシュが見つかりません。</div>;

  const savePng = () =>
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mesh.name || 'mesh'}_${uvSet}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  const overlapPercent =
    overlap && overlap.coveredCells > 0 ? (overlap.overlapCells / overlap.coveredCells) * 100 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorToolbar
        breadcrumbs={
          <Crumbs
            items={[
              model!.source.fileName,
              mesh.name || '(名前なし)',
              uvSet === 'uv' ? 'UV0' : 'UV1',
            ]}
          />
        }
      >
        <VsSelect
          label="UV セット"
          value={uvSet}
          onChange={(v) => setUvSet(v as UvSet)}
          options={[
            { value: 'uv', label: 'UV0' },
            ...(mesh.geometry.getAttribute('uv1') ? [{ value: 'uv1', label: 'UV1' }] : []),
          ]}
        />
        <VsCheckbox label="テクスチャ" checked={showTexture} onChange={setShowTexture} />
        <VsCheckbox label="重なり" checked={showOverlap} onChange={setShowOverlap} />
        <IconButton icon={Download} label="PNG で保存" onClick={savePng} disabled={!layout} />
      </EditorToolbar>
      <div
        ref={areaRef}
        className={`flex min-h-0 flex-1 items-center justify-center ${vsc.editor}`}
      >
        {layout ? (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="UV レイアウト"
            data-testid="uv-canvas"
            style={{ width: size, height: size }}
          />
        ) : (
          <p className={`text-[13px] ${vsc.muted}`}>
            このメッシュには {uvSet === 'uv' ? 'UV0' : 'UV1'} がありません。
          </p>
        )}
      </div>
      {layout && (
        <div
          className={`flex h-[22px] shrink-0 items-center gap-4 border-t px-3 text-[12px] ${vsc.border} ${vsc.editor} ${vsc.muted}`}
          data-testid="uv-stats"
        >
          <span>三角形: {formatNumber(layout.triangleCount)}</span>
          <span className={layout.outOfRange.length ? vsc.error : ''}>
            0〜1 の範囲外: {formatNumber(layout.outOfRange.length)}（赤）
          </span>
          <span className={overlapPercent > 0.1 ? vsc.warning : ''}>
            重なり（近似）: {overlapPercent.toFixed(1)}%（橙）
          </span>
        </div>
      )}
    </div>
  );
}
