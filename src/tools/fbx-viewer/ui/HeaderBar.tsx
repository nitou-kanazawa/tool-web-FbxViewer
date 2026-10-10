import { useState } from 'react';
import { PRESETS } from '../logic/inspection/presets';
import { useViewerStore } from '../store/viewerStore';
import { Select } from './common/controls';
import { MODEL_SAMPLES, fetchSampleFiles } from './samples';

export const MODEL_ACCEPT = '.fbx,.png,.jpg,.jpeg,.tga,.psd,.bmp,.webp';

export function HeaderBar() {
  const openFiles = useViewerStore((s) => s.openFiles);
  const presetId = useViewerStore((s) => s.presetId);
  const setPreset = useViewerStore((s) => s.setPreset);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const openSample = async (id: string) => {
    const sample = MODEL_SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    try {
      setSampleError(null);
      await openFiles(await fetchSampleFiles(sample.files));
    } catch (e) {
      setSampleError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
      <label className="inline-flex cursor-pointer items-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500">
        ファイルを選択
        <input
          type="file"
          multiple
          accept={MODEL_ACCEPT}
          aria-label="FBX ファイルを選択"
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) void openFiles(files);
            e.target.value = '';
          }}
        />
      </label>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        FBX とテクスチャ画像をまとめてドロップできます
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select
          label="サンプルを開く"
          value=""
          onChange={(v) => void openSample(v)}
          options={[
            { value: '', label: 'サンプルを開く…' },
            ...MODEL_SAMPLES.map((s) => ({ value: s.id, label: s.label })),
          ]}
          hideLabel
          testId="sample-select"
        />
        <Select
          label="検品プリセット"
          value={presetId}
          onChange={setPreset}
          options={PRESETS.map((p) => ({ value: p.id, label: p.name }))}
          testId="preset-select"
        />
      </div>
      {sampleError && <p className="w-full text-sm text-red-600">{sampleError}</p>}
    </div>
  );
}
