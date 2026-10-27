import { formatFbxVersion } from '../../../errors';
import { formatBytes, formatMeters, formatNumber } from '../../../logic/format';
import { summarize } from '../../../logic/inspection/runInspection';
import { describeUnit } from '../../../logic/units';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { Empty, PropertyGrid, Section, SeverityIcon } from '../primitives';
import { vsc } from '../styles';

/** 何も選んでいないとき：モデルの概要と統計。 */
export function ModelInspector() {
  const model = useViewerStore((s) => s.model);
  const analysis = useViewerStore((s) => s.analysis);
  const inspection = useViewerStore((s) => s.inspection);
  const showPanel = useWorkbenchStore((s) => s.showPanel);

  if (!model || !analysis) {
    return (
      <Empty>
        FBX
        を開くと、ここにモデルの情報が表示されます。シーンやボーンを選ぶと、その詳細に切り替わります。
      </Empty>
    );
  }
  const { stats } = analysis;
  const sum = summarize(inspection);
  const b = stats.bounds;
  const tiles: { id: string; label: string; value: number }[] = [
    { id: 'triangles', label: '三角形', value: stats.totals.triangleCount },
    { id: 'vertices', label: '頂点', value: stats.totals.vertexCount },
    { id: 'meshes', label: 'メッシュ', value: stats.totals.meshCount },
    { id: 'materials', label: 'マテリアル', value: stats.totals.materialCount },
    { id: 'textures', label: 'テクスチャ', value: stats.totals.textureCount },
    { id: 'bones', label: 'ボーン', value: stats.totals.boneCount },
    { id: 'clips', label: 'アニメ', value: stats.totals.clipCount },
    { id: 'morphs', label: 'シェイプ', value: stats.totals.morphTargetCount },
  ];

  return (
    <>
      <Section title="検品">
        <button
          type="button"
          onClick={() => showPanel('problems')}
          className={`mx-3 my-1 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded border px-2 py-1.5 text-[12px] ${vsc.border} ${vsc.hover}`}
          data-testid="inspection-summary"
        >
          <span className="flex items-center gap-1">
            <SeverityIcon level="ng" /> NG {sum.ng}
          </span>
          <span className="flex items-center gap-1">
            <SeverityIcon level="warn" /> 警告 {sum.warn}
          </span>
          <span className="flex items-center gap-1">
            <SeverityIcon level="ok" /> OK {sum.ok}
          </span>
        </button>
      </Section>
      <Section title="ファイル">
        <PropertyGrid
          rows={[
            ['名前', <span data-testid="file-name">{model.source.fileName}</span>],
            ['サイズ', formatBytes(model.source.fileSize)],
            [
              '形式',
              `FBX ${formatFbxVersion(model.source.version)}（${model.source.format === 'binary' ? 'バイナリ' : 'ASCII'}）`,
            ],
            ['単位', `1 単位 = ${describeUnit(model.unitScaleFactor)}`],
            ['UnitScaleFactor', String(model.unitScaleFactor)],
            ['上方向', stats.upAxis === 'Z' ? 'Z-up（補正済み）' : 'Y-up'],
          ]}
        />
      </Section>
      {b && (
        <Section title="大きさ（メートル）">
          <PropertyGrid
            testId="model-size"
            rows={[
              ['幅（X）', formatMeters(b.size[0])],
              ['高さ（Y）', formatMeters(b.size[1])],
              ['奥行き（Z）', formatMeters(b.size[2])],
              ['底面の高さ', formatMeters(b.min[1])],
            ]}
          />
        </Section>
      )}
      <Section title="統計">
        <div className="grid grid-cols-2 gap-1 px-3 py-1">
          {tiles.map((t) => (
            <div
              key={t.id}
              data-testid={`stat-${t.id}`}
              className="rounded-sm bg-black/[0.04] px-2 py-1 dark:bg-white/[0.06]"
            >
              <div className={`text-[11px] ${vsc.muted}`}>{t.label}</div>
              <div className={`text-[15px] font-semibold tabular-nums ${vsc.strong}`}>
                {formatNumber(t.value)}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="ヒント" defaultOpen={false}>
        <ul className={`list-disc space-y-1 pl-7 pr-3 text-[12px] ${vsc.muted}`}>
          <li>
            Blender の FBX 書き出しで「パスモード: コピー」＋埋め込みにすると、FBX 1
            つでテクスチャも渡せます。
          </li>
          <li>
            マテリアルはブラウザ用に変換して表示しています。Unity
            のシェーダーの見た目とは一致しません。
          </li>
          <li>ファイルはブラウザの中だけで処理され、外部には送信されません。</li>
        </ul>
      </Section>
    </>
  );
}
