import { secondsToFrame } from '../../../logic/clipAdapter';
import { availableAssets, useViewerStore } from '../../../store/viewerStore';
import { PropertyGrid, Section } from '../primitives';
import { vsc } from '../styles';

export function ClipInspector({ assetId, clipIndex }: { assetId: string; clipIndex: number }) {
  const model = useViewerStore((s) => s.model);
  const library = useViewerStore((s) => s.library);
  const fps = useViewerStore((s) => s.fps);
  const report = useViewerStore((s) => s.matchReport);
  const selected = useViewerStore((s) => s.selectedClip);
  const asset = availableAssets({ model, library }).find((a) => a.id === assetId);
  const clip = asset?.clips[clipIndex];
  if (!asset || !clip) return null;
  const isActive = selected?.assetId === assetId && selected.clipIndex === clipIndex;
  return (
    <>
      <Section title="アニメーション">
        <PropertyGrid
          rows={[
            ['名前', clip.name || `クリップ ${clipIndex + 1}`],
            ['ファイル', asset.name],
            ['入手元', asset.origin === 'embedded' ? 'モデル内蔵' : 'アニメライブラリ'],
            ['長さ', `${clip.duration.toFixed(2)} 秒（${secondsToFrame(clip.duration, fps)} f）`],
            ['トラック', String(clip.tracks.length)],
            ['ボーン', String(asset.boneNames.length)],
            ['ルート', asset.rootName ?? '―'],
          ]}
        />
      </Section>
      {isActive && report && (
        <Section title="ボーン照合">
          <PropertyGrid
            rows={[
              [
                '判定',
                {
                  ok: 'すべて一致',
                  partial: '一部が不一致',
                  'no-skeleton': 'モデルにリグがない',
                  'no-match': '一致しない',
                }[report.verdict],
              ],
              ['一致', `${report.matchedCount} / ${report.animBoneCount}`],
            ]}
          />
          {report.unmatchedAnim.length > 0 && (
            <div className="px-3 pt-1 text-[12px]">
              <p className={vsc.muted}>
                アニメ側で一致しなかったボーン（{report.unmatchedAnim.length}）
              </p>
              <p className={`break-all ${vsc.strong}`}>{report.unmatchedAnim.join(', ')}</p>
            </div>
          )}
          {report.unmatchedModel.length > 0 && (
            <div className="px-3 pt-1 text-[12px]">
              <p className={vsc.muted}>
                アニメで動かないモデル側のボーン（{report.unmatchedModel.length}）
              </p>
              <p className={`break-all ${vsc.strong}`}>{report.unmatchedModel.join(', ')}</p>
            </div>
          )}
        </Section>
      )}
    </>
  );
}
