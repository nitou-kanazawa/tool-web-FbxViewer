import { NO_MATERIALS, useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { ClipInspector } from './inspector/ClipInspector';
import { MaterialInspector } from './inspector/MaterialInspector';
import { ModelInspector } from './inspector/ModelInspector';
import { NodeInspector } from './inspector/NodeInspector';
import { TextureInspector } from './inspector/TextureInspector';
import { IconButton } from './primitives';
import { vsc } from './styles';
import { ArrowLeft } from 'lucide-react';

/** 右側のインスペクター。選んだものの詳細を表示し、何も選んでいなければモデルの概要。 */
export function Inspector() {
  const selection = useWorkbenchStore((s) => s.selection);
  const select = useWorkbenchStore((s) => s.select);
  const model = useViewerStore((s) => s.model);
  const materials = useViewerStore((s) => s.analysis?.materials ?? NO_MATERIALS);
  // 再生中にボーンの位置などを更新するため、時間の変化でも描き直す
  useViewerStore((s) => (s.playing ? Math.round(s.currentTime * 10) : 0));

  let content: JSX.Element = <ModelInspector />;
  let title = 'インスペクター';
  if (model && selection.kind === 'node') {
    const obj = model.root.getObjectByProperty('uuid', selection.uuid);
    if (obj) {
      content = <NodeInspector object={obj} />;
      title = obj.name || '(名前なし)';
    }
  } else if (model && selection.kind === 'material') {
    const info = materials.find((m) => m.material.uuid === selection.uuid);
    if (info) {
      content = <MaterialInspector info={info} />;
      title = info.name;
    }
  } else if (model && selection.kind === 'texture') {
    const src = model.textureSources.find((t) => t.texture.uuid === selection.uuid);
    if (src) {
      content = <TextureInspector source={src} />;
      title = src.fileName || src.texture.name || 'テクスチャ';
    }
  } else if (selection.kind === 'clip') {
    content = <ClipInspector assetId={selection.assetId} clipIndex={selection.clipIndex} />;
    title = 'アニメーション';
  }

  return (
    <aside
      aria-label="インスペクター"
      className={`flex h-full min-w-0 flex-col border-l ${vsc.border} ${vsc.sidebar} ${vsc.text}`}
      data-testid="inspector"
    >
      <div className="flex h-[35px] shrink-0 items-center gap-1 px-3">
        {selection.kind !== 'model' && model && (
          <IconButton
            icon={ArrowLeft}
            label="モデルの概要に戻る"
            onClick={() => select({ kind: 'model' })}
          />
        )}
        <span className={`truncate ${vsc.sectionHeader} font-normal`} title={title}>
          {title}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{content}</div>
    </aside>
  );
}
