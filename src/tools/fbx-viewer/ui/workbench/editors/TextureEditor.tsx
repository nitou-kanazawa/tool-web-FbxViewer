import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { Texture } from 'three';
import { textureSize } from '../../../logic/textures';
import { useViewerStore } from '../../../store/viewerStore';
import { TextureCanvas } from '../../common/TextureCanvas';
import { IconButton } from '../primitives';
import { vsc } from '../styles';
import { Crumbs, EditorToolbar } from './EditorToolbar';
import { useElementSize } from './useElementSize';

/** テクスチャを大きく表示する（透明部分は市松模様）。 */
export function TextureEditor({ textureUuid }: { textureUuid: string }) {
  const model = useViewerStore((s) => s.model);
  const textures = useViewerStore((s) => s.textures);
  const source = useMemo(
    () => model?.textureSources.find((t) => t.texture.uuid === textureUuid),
    [model, textureUuid],
  );
  const texture: Texture | undefined = source?.texture;
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const areaRef = useRef<HTMLDivElement>(null);
  const area = useElementSize(areaRef);

  if (!texture || !source)
    return <div className={`p-4 text-[13px] ${vsc.muted}`}>テクスチャが見つかりません。</div>;
  const missing = source.status === 'missing' || source.status === 'unsupported';
  const px = missing ? null : textureSize(texture);
  const natural = px ? Math.max(px.width, px.height) : 256;
  const fit = Math.max(32, Math.min(area.width, area.height) - 32);
  const display = Math.round(zoom === 'fit' ? fit : natural * zoom);
  const current = zoom === 'fit' ? fit / natural : zoom;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorToolbar
        breadcrumbs={
          <Crumbs
            items={[model!.source.fileName, source.fileName || texture.name || '(埋め込み)']}
          />
        }
      >
        <span className={vsc.muted}>{Math.round(current * 100)}%</span>
        <IconButton
          icon={ZoomOut}
          label="縮小"
          onClick={() => setZoom(Math.max(0.125, current / 2))}
        />
        <IconButton icon={ZoomIn} label="拡大" onClick={() => setZoom(Math.min(8, current * 2))} />
        <IconButton
          icon={Maximize}
          label="画面に合わせる"
          active={zoom === 'fit'}
          onClick={() => setZoom('fit')}
        />
        <button
          type="button"
          className={`rounded px-1.5 text-[12px] hover:bg-black/10 dark:hover:bg-white/10 ${zoom === 1 ? 'font-semibold' : ''}`}
          onClick={() => setZoom(1)}
        >
          1:1
        </button>
      </EditorToolbar>
      <div
        ref={areaRef}
        className={`flex min-h-0 flex-1 items-center justify-center overflow-auto ${vsc.editor}`}
      >
        <div
          className="shrink-0 bg-[length:16px_16px] bg-[linear-gradient(45deg,#8883_25%,transparent_25%,transparent_75%,#8883_75%),linear-gradient(45deg,#8883_25%,transparent_25%,transparent_75%,#8883_75%)] [background-position:0_0,8px_8px]"
          style={{ width: display, height: display }}
        >
          <TextureCanvas
            texture={texture}
            size={display}
            missing={missing}
            version={textures}
            label={source.fileName || texture.name}
          />
        </div>
      </div>
      <div
        className={`flex h-[22px] shrink-0 items-center gap-4 border-t px-3 text-[12px] ${vsc.border} ${vsc.editor} ${vsc.muted}`}
      >
        <span>
          {px ? `${px.width} × ${px.height} px` : missing ? '画像が見つかりません' : '読み込み中'}
        </span>
        <span>
          {
            {
              embedded: 'FBX に埋め込み',
              found: '外部ファイル',
              missing: '欠落',
              unsupported: '未対応の形式',
            }[source.status]
          }
        </span>
        {source.sourcePath && (
          <span className="truncate" title={source.sourcePath}>
            参照パス: {source.sourcePath}
          </span>
        )}
      </div>
    </div>
  );
}
