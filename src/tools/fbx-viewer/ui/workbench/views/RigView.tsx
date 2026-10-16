import { useMemo } from 'react';
import { checkHumanoid } from '../../../logic/humanoid';
import type { SceneNodeKind } from '../../../logic/sceneTree';
import { useViewerStore } from '../../../store/viewerStore';
import { toggleWeights } from '../actions';
import { Empty, Section, SeverityIcon, VsCheckbox } from '../primitives';
import { vsc } from '../styles';
import { SceneTreeView } from './SceneTreeView';

const onlyBones = (kind: SceneNodeKind) => kind === 'bone';

export function RigView() {
  const model = useViewerStore((s) => s.model);
  const rig = useViewerStore((s) => s.rig);
  const shading = useViewerStore((s) => s.shading);
  const showSkeleton = useViewerStore((s) => s.showSkeleton);
  const setView = useViewerStore((s) => s.setView);
  const showBindPose = useViewerStore((s) => s.showBindPose);
  const humanoid = useMemo(() => checkHumanoid(rig?.boneNames ?? []), [rig]);

  if (!model) return <Empty>FBX を開くと、ボーンの階層とウェイトを確認できます。</Empty>;
  if (!rig || rig.boneNames.length === 0)
    return <Empty>このモデルにはリグ（ボーン）がありません。</Empty>;

  const found = humanoid.filter((h) => h.bone).length;
  return (
    <>
      <Section title="表示">
        <div className="flex flex-col gap-1 px-3 py-1">
          <VsCheckbox
            label="スケルトンを表示"
            checked={showSkeleton}
            onChange={(v) => setView({ showSkeleton: v })}
          />
          <VsCheckbox
            label="選んだボーンのウェイトを表示"
            checked={shading === 'boneWeight'}
            onChange={toggleWeights}
          />
          <div className={`flex items-center gap-1 text-[11px] ${vsc.muted}`}>
            <span className="h-2 w-20 rounded-sm bg-gradient-to-r from-[#0d0d40] via-[#00ff00] to-[#ff0000]" />{' '}
            0 → 1
          </div>
          <button
            type="button"
            className={`mt-1 self-start text-[12px] ${vsc.buttonSecondary}`}
            onClick={showBindPose}
          >
            バインドポーズに戻す
          </button>
        </div>
      </Section>
      <Section title={`ボーン (${rig.boneNames.length})`}>
        <SceneTreeView root={model.root} filter={onlyBones} defaultDepth={3} testId="bone-tree" />
      </Section>
      <Section title={`Unity Humanoid (${found}/${humanoid.length})`} testId="humanoid-check">
        {humanoid.map((h) => (
          <div key={h.id} className="flex h-[22px] items-center gap-1.5 px-3 text-[12px]">
            <SeverityIcon level={h.bone ? 'ok' : 'ng'} size={13} />
            <span className={vsc.strong}>{h.label}</span>
            <span className={`truncate ${vsc.muted}`}>{h.bone ?? '見つかりません'}</span>
          </div>
        ))}
        <p className={`px-3 pt-1 text-[11px] ${vsc.muted}`}>
          名前から推定しています。最終的な割り当ては Unity の Avatar 設定で確認してください。
        </p>
      </Section>
    </>
  );
}
