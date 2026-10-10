import { useMemo, useState } from 'react';
import type { Texture } from 'three';
import type { ResourceStatus } from '../../infra/ResourceResolver';
import { textureSize } from '../../logic/textures';
import type { ShadingMode } from '../../services/DisplayModeManager';
import { useViewerStore } from '../../store/viewerStore';
import { Button, EmptyState, Section } from '../common/controls';
import { TextureCanvas } from '../common/TextureCanvas';

const STATUS_LABEL: Record<ResourceStatus, { text: string; className: string }> = {
  embedded: {
    text: '埋め込み',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  found: {
    text: '外部ファイル',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  },
  missing: { text: '欠落', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  unsupported: {
    text: '未対応の形式',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
};

const CHANNELS: { id: ShadingMode; label: string }[] = [
  { id: 'standard', label: '通常' },
  { id: 'baseColor', label: 'ベースカラー' },
  { id: 'normalMap', label: '法線マップ' },
  { id: 'white', label: '白' },
];

export function TexturePanel() {
  const model = useViewerStore((s) => s.model);
  const materials = useViewerStore((s) => s.analysis?.materials ?? []);
  const textures = useViewerStore((s) => s.textures);
  const shading = useViewerStore((s) => s.shading);
  const setView = useViewerStore((s) => s.setView);
  const [zoom, setZoom] = useState<{ texture: Texture; title: string; missing: boolean } | null>(
    null,
  );

  const sources = useMemo(
    () => new Map((model?.textureSources ?? []).map((s) => [s.texture, s])),
    [model],
  );

  if (!model)
    return <EmptyState>FBX を読み込むと、マテリアルとテクスチャの一覧が表示されます。</EmptyState>;

  return (
    <div className="space-y-6">
      <Section title="3D ビューの表示チャンネル">
        <div className="flex flex-wrap gap-1" role="group" aria-label="表示チャンネル">
          {CHANNELS.map((c) => (
            <Button
              key={c.id}
              active={shading === c.id}
              aria-pressed={shading === c.id}
              onClick={() => setView({ shading: c.id })}
            >
              {c.label}
            </Button>
          ))}
        </div>
        {textures === undefined && (
          <p className="text-xs text-slate-500">テクスチャを読み込み中…</p>
        )}
      </Section>

      <Section title={`マテリアル（${materials.length}）`}>
        {materials.length === 0 && <EmptyState>マテリアルがありません。</EmptyState>}
        <ul className="space-y-3">
          {materials.map((m) => (
            <li
              key={m.material.uuid}
              className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
              data-testid="material-item"
            >
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="text-xs text-slate-500">
                {m.type} ／ 使用メッシュ: {m.meshNames.join(', ') || '―'}
              </p>
              {m.textures.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">テクスチャは割り当てられていません。</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {m.textures.map((t) => {
                    const src = sources.get(t.texture);
                    const status = src?.status ?? 'embedded';
                    const missing = status === 'missing' || status === 'unsupported';
                    const size = missing ? null : textureSize(t.texture);
                    const name = src?.fileName || t.texture.name || '(埋め込み)';
                    return (
                      <li
                        key={`${t.slot}-${t.texture.uuid}`}
                        className="flex items-center gap-3"
                        data-testid="texture-item"
                      >
                        <button
                          type="button"
                          aria-label={`${name} を拡大表示`}
                          onClick={() =>
                            setZoom({
                              texture: t.texture,
                              title: `${m.name} / ${t.slotLabel} / ${name}`,
                              missing,
                            })
                          }
                        >
                          <TextureCanvas
                            texture={t.texture}
                            size={64}
                            missing={missing}
                            version={textures}
                            label={name}
                          />
                        </button>
                        <div className="min-w-0 text-xs">
                          <p className="font-medium text-slate-700 dark:text-slate-200">
                            {t.slotLabel}
                          </p>
                          <p className="break-all text-slate-500">{name}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1">
                            <span
                              className={`rounded px-1.5 py-0.5 ${STATUS_LABEL[status].className}`}
                            >
                              {STATUS_LABEL[status].text}
                            </span>
                            {size && (
                              <span className="tabular-nums text-slate-500">
                                {size.width}×{size.height}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="テクスチャの拡大表示"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoom(null)}
        >
          <div
            className="rounded-lg bg-white p-4 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold">{zoom.title}</p>
              <Button onClick={() => setZoom(null)} aria-label="閉じる">
                ✕
              </Button>
            </div>
            <TextureCanvas
              texture={zoom.texture}
              size={Math.min(512, window.innerWidth - 64)}
              missing={zoom.missing}
              version={textures}
              label={zoom.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
