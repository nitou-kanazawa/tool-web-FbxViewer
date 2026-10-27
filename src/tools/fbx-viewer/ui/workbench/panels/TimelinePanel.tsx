import { Pause, Play, Repeat, Square } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { secondsToFrame } from '../../../logic/clipAdapter';
import { availableAssets, useViewerStore } from '../../../store/viewerStore';
import { filesFromDrop } from '../../dropFiles';
import { addAnimationFiles, selectClip } from '../actions';
import { IconButton, VsCheckbox, VsSelect } from '../primitives';
import { vsc } from '../styles';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

/** タイムライン（アニメの選択と再生）。アニメ FBX のドロップも受け付ける。 */
export function TimelinePanel() {
  const s = useViewerStore(
    useShallow((st) => ({
      model: st.model,
      library: st.library,
      selectedClip: st.selectedClip,
      activeClip: st.activeClip,
      matchReport: st.matchReport,
      playing: st.playing,
      loop: st.loop,
      speed: st.speed,
      rootMotion: st.rootMotion,
      fps: st.fps,
      setPlaying: st.setPlaying,
      stop: st.stop,
      setAnimation: st.setAnimation,
      seek: st.seek,
      selectClipRaw: st.selectClip,
    })),
  );
  const currentTime = useViewerStore((st) => st.currentTime);
  const [dragging, setDragging] = useState(false);
  const assets = availableAssets({ model: s.model, library: s.library });
  const options = assets.flatMap((a) =>
    a.clips.map((c, i) => ({
      value: `${a.id}::${i}`,
      label: `${c.name || `クリップ ${i + 1}`}（${a.name}）`,
      group: a.origin === 'embedded' ? 'モデル内蔵' : 'アニメライブラリ',
    })),
  );
  const duration = s.activeClip?.duration ?? 0;
  const frame = secondsToFrame(Math.min(currentTime, duration), s.fps);
  const total = secondsToFrame(duration, s.fps);
  const r = s.matchReport;

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = await filesFromDrop(e.dataTransfer);
    if (files.length) await addAnimationFiles(files);
  };

  return (
    <div
      className={`flex h-full flex-col gap-1.5 px-3 py-2 text-[12px] ${dragging ? 'outline outline-2 -outline-offset-2 outline-[#007fd4]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="timeline"
    >
      <div className="flex flex-wrap items-center gap-2">
        <VsSelect
          label="クリップ"
          value={s.selectedClip ? `${s.selectedClip.assetId}::${s.selectedClip.clipIndex}` : ''}
          onChange={(v) => {
            if (!v) return s.selectClipRaw(null);
            const [assetId, index] = v.split('::');
            selectClip({ assetId, clipIndex: Number(index) });
          }}
          options={[
            {
              value: '',
              label: options.length
                ? 'クリップを選択…'
                : 'クリップがありません（アニメ FBX をドロップ）',
            },
            ...options,
          ]}
          testId="clip-select"
          className="max-w-[360px]"
        />
        <IconButton
          icon={s.playing ? Pause : Play}
          label={s.playing ? '一時停止' : '再生'}
          keybinding="Space"
          disabled={!s.activeClip}
          onClick={() => s.setPlaying(!s.playing)}
          data-testid="play-button"
        />
        <IconButton
          icon={Square}
          size={13}
          label="停止"
          disabled={!s.activeClip}
          onClick={s.stop}
        />
        <IconButton
          icon={Repeat}
          label="ループ"
          active={s.loop}
          onClick={() => s.setAnimation({ loop: !s.loop })}
        />
        <VsSelect
          label="速度"
          value={String(s.speed)}
          onChange={(v) => s.setAnimation({ speed: Number(v) })}
          options={SPEEDS.map((v) => ({ value: String(v), label: `${v}x` }))}
        />
        <VsCheckbox
          label="ルートモーション"
          checked={s.rootMotion}
          onChange={(v) => s.setAnimation({ rootMotion: v })}
        />
        {r && (
          <span
            className={`ml-auto ${r.verdict === 'ok' ? vsc.ok : r.verdict === 'partial' ? vsc.warning : vsc.error}`}
            data-testid="match-report"
            data-verdict={r.verdict}
          >
            {
              {
                ok: 'すべてのボーンが一致',
                partial: '一部のボーンが一致しません',
                'no-skeleton': 'このモデルにはリグがありません',
                'no-match': 'ボーン名が一致しません',
              }[r.verdict]
            }
            {r.verdict !== 'no-skeleton' && (
              <span className={`ml-1 ${vsc.muted}`}>
                （ボーン照合: {r.matchedCount} / {r.animBoneCount} 一致）
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          aria-label="再生位置"
          min={0}
          max={duration || 1}
          step={1 / s.fps}
          value={Math.min(currentTime, duration)}
          disabled={!s.activeClip}
          onChange={(e) => {
            s.setPlaying(false);
            s.seek(Number(e.target.value));
          }}
          className="h-1 min-w-0 flex-1 accent-[#007acc]"
        />
        <span
          className={`w-36 shrink-0 text-right tabular-nums ${vsc.text}`}
          data-testid="frame-counter"
        >
          {frame} / {total} f（{s.fps}fps）
        </span>
      </div>
      {!s.model && (
        <p className={vsc.muted}>
          モデルを開くと、アニメを当てて再生できます。ここにアニメ FBX
          をドロップして追加することもできます。
        </p>
      )}
    </div>
  );
}
