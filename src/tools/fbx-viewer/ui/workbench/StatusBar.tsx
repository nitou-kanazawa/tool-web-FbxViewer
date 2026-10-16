import { CircleX, Loader2, Pause, Play, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatFbxVersion } from '../../errors';
import { secondsToFrame } from '../../logic/clipAdapter';
import { formatNumber } from '../../logic/format';
import { findPreset } from '../../logic/inspection/presets';
import { summarize } from '../../logic/inspection/runInspection';
import { describeUnit } from '../../logic/units';
import { useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore } from '../../store/workbenchStore';

function Item({
  children,
  onClick,
  title,
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  testId?: string;
}) {
  const cls = 'inline-flex h-full items-center gap-1 px-1.5 whitespace-nowrap';
  return onClick ? (
    <button
      type="button"
      title={title}
      onClick={onClick}
      data-testid={testId}
      className={`${cls} hover:bg-white/15 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white`}
    >
      {children}
    </button>
  ) : (
    <span title={title} data-testid={testId} className={cls}>
      {children}
    </span>
  );
}

/** 最下段のステータスバー（VS Code と同じく、何も開いていないときは紫）。 */
export function StatusBar() {
  const s = useViewerStore();
  const showPanel = useWorkbenchStore((w) => w.showPanel);
  const setPaletteOpen = useWorkbenchStore((w) => w.setPaletteOpen);
  const sum = summarize(s.inspection);
  const model = s.model;
  const stats = s.analysis?.stats;
  const clipName = s.activeClip?.name;

  return (
    <footer
      className={`flex h-[22px] shrink-0 items-stretch text-[12px] text-white ${model ? 'bg-[#007acc]' : 'bg-[#68217a]'}`}
      aria-label="ステータスバー"
    >
      <Item onClick={() => showPanel('problems')} title="問題を表示" testId="status-problems">
        <CircleX size={13} /> {sum.ng} <TriangleAlert size={13} className="ml-1" /> {sum.warn}
      </Item>
      {s.status === 'loading' && (
        <Item>
          <Loader2 size={13} className="animate-spin" /> 読み込み中…
        </Item>
      )}
      {model && (
        <>
          <Item title="ファイル名" testId="status-file">
            {model.source.fileName}
          </Item>
          <Item title="形式">
            FBX {formatFbxVersion(model.source.version)}{' '}
            {model.source.format === 'binary' ? 'バイナリ' : 'ASCII'}
          </Item>
          <Item title="ファイルの単位">単位: {describeUnit(model.unitScaleFactor)}</Item>
        </>
      )}
      <div className="ml-auto flex items-stretch">
        {clipName && (
          <Item onClick={() => showPanel('timeline')} title="タイムラインを表示">
            {s.playing ? <Play size={12} /> : <Pause size={12} />}
            {clipName} {secondsToFrame(s.currentTime, s.fps)}/
            {secondsToFrame(s.activeClip?.duration ?? 0, s.fps)}f
          </Item>
        )}
        {stats && (
          <>
            <Item title="三角形の数">{formatNumber(stats.totals.triangleCount)} 三角形</Item>
            {stats.totals.boneCount > 0 && (
              <Item title="ボーンの数">{stats.totals.boneCount} ボーン</Item>
            )}
          </>
        )}
        <Item
          onClick={() => setPaletteOpen(true, 'プリセット: ')}
          title="検品プリセットを切り替える"
          testId="status-preset"
        >
          {findPreset(s.presetId).name}
        </Item>
      </div>
    </footer>
  );
}
