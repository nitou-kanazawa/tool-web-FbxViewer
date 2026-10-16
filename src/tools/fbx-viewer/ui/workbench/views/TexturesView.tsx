import { useMemo, useState } from 'react';
import type { ResourceStatus } from '../../../infra/ResourceResolver';
import { textureSize } from '../../../logic/textures';
import { NO_MATERIALS, useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { openTextureEditor } from '../actions';
import { Empty, Row, Section, SeverityIcon } from '../primitives';
import { ImageIcon, MaterialIcon } from './icons';

const STATUS_TEXT: Record<ResourceStatus, string> = {
  embedded: '埋め込み',
  found: '外部ファイル',
  missing: '欠落',
  unsupported: '未対応の形式',
};

export function TexturesView() {
  const model = useViewerStore((s) => s.model);
  const materials = useViewerStore((s) => s.analysis?.materials ?? NO_MATERIALS);
  useViewerStore((s) => s.textures); // 読み込み完了で解像度を描き直す
  const selection = useWorkbenchStore((s) => s.selection);
  const select = useWorkbenchStore((s) => s.select);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const sources = useMemo(
    () => new Map((model?.textureSources ?? []).map((s) => [s.texture, s])),
    [model],
  );

  if (!model) return <Empty>FBX を開くと、マテリアルとテクスチャの一覧が表示されます。</Empty>;

  return (
    <Section title={`マテリアル (${materials.length})`}>
      <div role="tree" data-testid="material-tree">
        {materials.length === 0 && <Empty>マテリアルがありません。</Empty>}
        {materials.map((m) => {
          const open = !collapsed.has(m.material.uuid);
          return (
            <div key={m.material.uuid}>
              <Row
                icon={<MaterialIcon />}
                label={m.name}
                description={m.type.replace('Material', '')}
                expanded={m.textures.length > 0 ? open : undefined}
                onToggle={() => {
                  const next = new Set(collapsed);
                  if (open) next.add(m.material.uuid);
                  else next.delete(m.material.uuid);
                  setCollapsed(next);
                }}
                selected={selection.kind === 'material' && selection.uuid === m.material.uuid}
                onClick={() => select({ kind: 'material', uuid: m.material.uuid })}
                testId="material-item"
              />
              {open &&
                m.textures.map((t) => {
                  const src = sources.get(t.texture);
                  const status = src?.status ?? 'embedded';
                  const bad = status === 'missing' || status === 'unsupported';
                  const size = bad ? null : textureSize(t.texture);
                  const name = src?.fileName || t.texture.name || '(埋め込み)';
                  return (
                    <Row
                      key={`${t.slot}-${t.texture.uuid}`}
                      depth={1}
                      icon={bad ? <SeverityIcon level="ng" /> : <ImageIcon />}
                      label={`${t.slotLabel}: ${name}`}
                      description={
                        bad
                          ? STATUS_TEXT[status]
                          : size
                            ? `${size.width}×${size.height}`
                            : '読み込み中'
                      }
                      title={`${name}（${STATUS_TEXT[status]}）。ダブルクリックで開く`}
                      selected={selection.kind === 'texture' && selection.uuid === t.texture.uuid}
                      onClick={() => select({ kind: 'texture', uuid: t.texture.uuid })}
                      onDoubleClick={() => openTextureEditor(t.texture, name)}
                      testId="texture-item"
                    />
                  );
                })}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
