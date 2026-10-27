import type { Material, Texture } from 'three';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { TextureCanvas } from '../../common/TextureCanvas';
import { PropertyGrid, Row, Section } from '../primitives';
import { vsc } from '../styles';
import type { MaterialInfo } from '../../../logic/textures';
import { NodeIcon } from '../views/icons';
import { selectNode } from '../actions';

export function MaterialInspector({ info }: { info: MaterialInfo }) {
  const model = useViewerStore((s) => s.model);
  const textures = useViewerStore((s) => s.textures);
  const select = useWorkbenchStore((s) => s.select);
  const m = info.material as Material & { color?: { getHexString(): string }; side: number };
  const sources = new Map((model?.textureSources ?? []).map((s) => [s.texture, s]));
  return (
    <>
      <Section title="マテリアル">
        <PropertyGrid
          rows={[
            ['名前', info.name],
            ['種類', info.type],
            [
              '色',
              m.color ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-sm border border-black/20"
                    style={{ background: `#${m.color.getHexString()}` }}
                  />
                  #{m.color.getHexString()}
                </span>
              ) : (
                '―'
              ),
            ],
            ['両面', m.side === 2 ? 'はい' : 'いいえ'],
            ['透明', m.transparent ? 'はい' : 'いいえ'],
          ]}
        />
      </Section>
      <Section title={`テクスチャ (${info.textures.length})`}>
        {info.textures.length === 0 && (
          <p className={`px-3 text-[12px] ${vsc.muted}`}>割り当てられていません。</p>
        )}
        {info.textures.map((t) => {
          const src = sources.get(t.texture as Texture);
          const missing = src?.status === 'missing' || src?.status === 'unsupported';
          return (
            <button
              key={`${t.slot}-${t.texture.uuid}`}
              type="button"
              onClick={() => select({ kind: 'texture', uuid: t.texture.uuid })}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left text-[12px] ${vsc.hover}`}
            >
              <TextureCanvas
                texture={t.texture}
                size={40}
                missing={missing}
                version={textures}
                label={t.slotLabel}
              />
              <span className="min-w-0">
                <span className={`block ${vsc.strong}`}>{t.slotLabel}</span>
                <span className={`block truncate ${missing ? vsc.error : vsc.muted}`}>
                  {src?.fileName || t.texture.name || '(埋め込み)'}
                  {missing ? '（欠落）' : ''}
                </span>
              </span>
            </button>
          );
        })}
      </Section>
      <Section title="使っているメッシュ">
        {info.meshNames.map((name) => {
          const obj = model?.root.getObjectByName(name);
          return (
            <Row
              key={name}
              icon={<NodeIcon kind="mesh" />}
              label={name || '(名前なし)'}
              onClick={() => obj && selectNode(obj.uuid)}
            />
          );
        })}
      </Section>
    </>
  );
}
