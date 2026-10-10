import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { secondsToFrame } from '../../logic/clipAdapter';
import { availableAssets, useViewerStore } from '../../store/viewerStore';
import { Button, Select, Toggle } from '../common/controls';
import { filesFromDrop } from '../dropFiles';
import { ANIMATION_SAMPLES, fetchSampleFiles } from '../samples';
import { MatchReportView } from './MatchReportView';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

/** アニメの選択・再生・ライブラリ管理（P2）。アニメ FBX のドロップも受け付ける。 */
export function AnimationBar() {
  const s = useViewerStore(
    useShallow((st) => ({
      model: st.model,
      library: st.library,
      libraryBusy: st.libraryBusy,
      libraryPersistent: st.libraryPersistent,
      selectedClip: st.selectedClip,
      activeClip: st.activeClip,
      matchReport: st.matchReport,
      playing: st.playing,
      loop: st.loop,
      speed: st.speed,
      rootMotion: st.rootMotion,
      fps: st.fps,
      selectClip: st.selectClip,
      setPlaying: st.setPlaying,
      stop: st.stop,
      setAnimation: st.setAnimation,
      seek: st.seek,
      addAnimations: st.addAnimations,
      removeAnimation: st.removeAnimation,
    })),
  );
  const currentTime = useViewerStore((st) => st.currentTime);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const assets = useMemo(
    () => availableAssets({ model: s.model, library: s.library }),
    [s.model, s.library],
  );
  const options = assets.flatMap((a) =>
    a.clips.map((c, i) => ({
      value: `${a.id}::${i}`,
      label:
        a.clips.length > 1
          ? `${c.name || `クリップ ${i + 1}`}（${a.name}）`
          : `${c.name || a.name}（${a.name}）`,
      group: a.origin === 'embedded' ? 'モデル内蔵' : 'アニメライブラリ',
    })),
  );
  const selectedValue = s.selectedClip
    ? `${s.selectedClip.assetId}::${s.selectedClip.clipIndex}`
    : '';
  const duration = s.activeClip?.duration ?? 0;

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = await filesFromDrop(e.dataTransfer);
    if (files.length > 0) await s.addAnimations(files);
  };

  return (
    <div
      aria-label="アニメーション"
      data-testid="animation-bar"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`space-y-2 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900 ${
        dragging ? 'border-sky-400 ring-2 ring-sky-400' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">アニメ</span>
        <Select
          label="クリップ"
          hideLabel
          value={selectedValue}
          onChange={(v) => {
            if (!v) return s.selectClip(null);
            const [assetId, index] = v.split('::');
            s.selectClip({ assetId, clipIndex: Number(index) });
          }}
          options={[
            { value: '', label: options.length ? 'クリップを選択…' : 'クリップがありません' },
            ...options,
          ]}
          testId="clip-select"
        />
        <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
          ＋ アニメ FBX を追加
          <input
            ref={inputRef}
            type="file"
            accept=".fbx"
            multiple
            aria-label="アニメ FBX を追加"
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) void s.addAnimations(files);
              e.target.value = '';
            }}
          />
        </label>
        <Button
          disabled={s.libraryBusy}
          onClick={async () => s.addAnimations(await fetchSampleFiles(ANIMATION_SAMPLES))}
        >
          サンプルアニメを追加
        </Button>
        <Button onClick={() => setShowLibrary((v) => !v)} aria-expanded={showLibrary}>
          ライブラリ（{s.library.length}）
        </Button>
        {s.libraryBusy && <span className="text-xs text-slate-500">読み込み中…</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => s.setPlaying(!s.playing)}
          disabled={!s.activeClip}
          aria-label={s.playing ? '一時停止' : '再生'}
          data-testid="play-button"
        >
          {s.playing ? '⏸' : '▶'}
        </Button>
        <Button onClick={s.stop} disabled={!s.activeClip} aria-label="停止">
          ⏹
        </Button>
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
          className="min-w-[120px] flex-1 accent-sky-500"
        />
        <span
          className="w-28 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300"
          data-testid="frame-counter"
        >
          {secondsToFrame(Math.min(currentTime, duration), s.fps)} /{' '}
          {secondsToFrame(duration, s.fps)} f（{s.fps}fps）
        </span>
        <Toggle label="ループ" checked={s.loop} onChange={(v) => s.setAnimation({ loop: v })} />
        <Select
          label="速度"
          value={String(s.speed)}
          onChange={(v) => s.setAnimation({ speed: Number(v) })}
          options={SPEEDS.map((v) => ({ value: String(v), label: `${v}x` }))}
        />
        <Toggle
          label="ルートモーション"
          checked={s.rootMotion}
          onChange={(v) => s.setAnimation({ rootMotion: v })}
        />
      </div>

      {s.matchReport && <MatchReportView report={s.matchReport} />}
      {!s.model && (
        <p className="text-xs text-slate-500">
          モデルを読み込むと、アニメを当てて再生できます。ここにアニメ FBX
          をドロップしても追加できます。
        </p>
      )}

      {showLibrary && (
        <div
          className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800"
          data-testid="animation-library"
        >
          <p className="mb-1 text-xs text-slate-500">
            {s.libraryPersistent
              ? 'アニメはこのブラウザの中（IndexedDB）に保存され、次回も使えます。外部には送信されません。'
              : 'このブラウザでは保存できないため、ページを閉じると消えます。'}
          </p>
          {s.library.length === 0 ? (
            <p className="text-xs text-slate-500">
              まだありません。Mixamo などのアニメ FBX を追加してください。
            </p>
          ) : (
            <ul className="space-y-1">
              {s.library.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {a.name}
                    <span className="ml-1 text-xs text-slate-500">
                      （{a.clips.length} クリップ・ボーン {a.boneNames.length}）
                    </span>
                  </span>
                  <Button
                    onClick={() => void s.removeAnimation(a.id)}
                    aria-label={`${a.name} を削除`}
                  >
                    削除
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
