import { useMemo } from 'react';
import { buildBoneTree, flattenBoneTree } from '../../logic/boneWeights';
import { checkHumanoid } from '../../logic/humanoid';
import { useViewerStore } from '../../store/viewerStore';
import { Button, EmptyState, Section, Toggle } from '../common/controls';

export function RigPanel() {
  const model = useViewerStore((s) => s.model);
  const rig = useViewerStore((s) => s.rig);
  const selected = useViewerStore((s) => s.selectedBoneUuid);
  const shading = useViewerStore((s) => s.shading);
  const showSkeleton = useViewerStore((s) => s.showSkeleton);
  const setView = useViewerStore((s) => s.setView);
  const showBindPose = useViewerStore((s) => s.showBindPose);

  const bones = useMemo(() => (model ? flattenBoneTree(buildBoneTree(model.root)) : []), [model]);
  const humanoid = useMemo(() => checkHumanoid(rig?.boneNames ?? []), [rig]);

  if (!model)
    return <EmptyState>FBX を読み込むと、ボーンの階層とウェイトを確認できます。</EmptyState>;
  if (bones.length === 0)
    return <EmptyState>このモデルにはリグ（ボーン）がありません。</EmptyState>;

  const found = humanoid.filter((h) => h.bone).length;
  const weightOn = shading === 'boneWeight';

  return (
    <div className="space-y-6">
      <Section title="表示">
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            label="スケルトンを表示"
            checked={showSkeleton}
            onChange={(v) => setView({ showSkeleton: v })}
          />
          <Button
            active={weightOn}
            aria-pressed={weightOn}
            onClick={() => setView({ shading: weightOn ? 'standard' : 'boneWeight' })}
          >
            ウェイトを表示
          </Button>
          <Button onClick={showBindPose}>バインドポーズに戻す</Button>
        </div>
        {weightOn && (
          <p className="text-xs text-slate-500">
            {selected ? '選んだボーンのウェイト：' : '下の一覧からボーンを選んでください。'}
            <span className="ml-1 inline-flex items-center gap-1 align-middle">
              <span className="h-2 w-16 rounded bg-gradient-to-r from-blue-700 via-green-500 to-red-500" />
              0 → 1
            </span>
          </p>
        )}
      </Section>

      <Section
        title={`ボーン（${bones.length}）`}
        right={
          rig?.rootName && <span className="text-xs text-slate-500">ルート: {rig.rootName}</span>
        }
      >
        <ul
          className="max-h-72 overflow-y-auto rounded-md border border-slate-200 text-xs dark:border-slate-800"
          data-testid="bone-tree"
        >
          {bones.map((b) => (
            <li key={b.uuid}>
              <button
                type="button"
                aria-pressed={selected === b.uuid}
                onClick={() =>
                  setView({
                    selectedBoneUuid: selected === b.uuid ? null : b.uuid,
                    ...(selected !== b.uuid && !weightOn ? { shading: 'boneWeight' as const } : {}),
                  })
                }
                className={`block w-full truncate py-1 pr-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  selected === b.uuid
                    ? 'bg-sky-100 font-semibold text-sky-800 dark:bg-sky-900 dark:text-sky-100'
                    : ''
                }`}
                style={{ paddingLeft: 8 + b.depth * 12 }}
              >
                {b.children.length > 0 ? '▾ ' : '・'}
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Unity Humanoid の必須ボーン（${found} / ${humanoid.length}）`}>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs" data-testid="humanoid-check">
          {humanoid.map((h) => (
            <li
              key={h.id}
              className={
                h.bone ? 'text-slate-600 dark:text-slate-300' : 'text-red-600 dark:text-red-400'
              }
            >
              {h.bone ? '✅' : '❌'} {h.label}
              <span className="ml-1 text-slate-400">{h.bone ?? '見つかりません'}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          名前から推定しています。最終的な割り当ては Unity の Avatar 設定で確認してください。
        </p>
      </Section>
    </div>
  );
}
