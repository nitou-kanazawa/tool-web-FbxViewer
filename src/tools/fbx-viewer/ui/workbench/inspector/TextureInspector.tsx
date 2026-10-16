import { textureSize } from '../../../logic/textures';
import { NO_MATERIALS, useViewerStore } from '../../../store/viewerStore';
import { TextureCanvas } from '../../common/TextureCanvas';
import { openTextureEditor } from '../actions';
import { PropertyGrid, Section } from '../primitives';
import { vsc } from '../styles';
import type { TextureSource } from '../../../infra/FbxModelLoader';
import { isPowerOfTwo } from '../../../logic/textures';

const STATUS = {
  embedded: 'FBX に埋め込み',
  found: '外部ファイル',
  missing: '欠落',
  unsupported: '未対応の形式',
} as const;

export function TextureInspector({ source }: { source: TextureSource }) {
  const textures = useViewerStore((s) => s.textures);
  const materials = useViewerStore((s) => s.analysis?.materials ?? NO_MATERIALS);
  const missing = source.status === 'missing' || source.status === 'unsupported';
  const size = missing ? null : textureSize(source.texture);
  const name = source.fileName || source.texture.name || '(埋め込み)';
  const usages = materials.flatMap((m) =>
    m.textures.filter((t) => t.texture === source.texture).map((t) => `${m.name} / ${t.slotLabel}`),
  );
  return (
    <>
      <Section title="テクスチャ">
        <div className="flex justify-center px-3 py-2">
          <button
            type="button"
            title="エディタで開く"
            onClick={() => openTextureEditor(source.texture, name)}
          >
            <TextureCanvas
              texture={source.texture}
              size={180}
              missing={missing}
              version={textures}
              label={name}
            />
          </button>
        </div>
        <PropertyGrid
          rows={[
            ['名前', name],
            ['状態', <span className={missing ? vsc.error : ''}>{STATUS[source.status]}</span>],
            ['解像度', size ? `${size.width} × ${size.height}` : '―'],
            [
              '2 のべき乗',
              size
                ? isPowerOfTwo(size.width) && isPowerOfTwo(size.height)
                  ? 'はい'
                  : 'いいえ'
                : '―',
            ],
            ['参照パス', source.sourcePath || '―'],
            ['使用箇所', usages.join('、') || '―'],
          ]}
        />
        <div className="px-3 pt-1">
          <button
            type="button"
            className={`text-[12px] ${vsc.link}`}
            onClick={() => openTextureEditor(source.texture, name)}
          >
            エディタで開く
          </button>
        </div>
      </Section>
    </>
  );
}
