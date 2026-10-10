import {
  SHADING_LABELS,
  WIREFRAME_LABELS,
  type ShadingMode,
  type WireframeMode,
} from '../services/DisplayModeManager';
import { useShallow } from 'zustand/react/shallow';
import { useViewerStore, type Background } from '../store/viewerStore';
import { Button, Select, Toggle } from './common/controls';

const BACKGROUNDS: { id: Background; label: string }[] = [
  { id: 'dark', label: '暗' },
  { id: 'gray', label: '中' },
  { id: 'light', label: '明' },
];

export function ViewerToolbar() {
  const s = useViewerStore(
    useShallow((st) => ({
      shading: st.shading,
      wireframe: st.wireframe,
      background: st.background,
      showGrid: st.showGrid,
      showAxes: st.showAxes,
      showSkeleton: st.showSkeleton,
      hasModel: st.model !== null,
      setView: st.setView,
      resetCamera: st.resetCamera,
    })),
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <Select
        label="表示"
        value={s.shading}
        onChange={(v) => s.setView({ shading: v as ShadingMode })}
        options={Object.entries(SHADING_LABELS).map(([value, label]) => ({ value, label }))}
        testId="shading-select"
      />
      <Select
        label="ワイヤー"
        value={s.wireframe}
        onChange={(v) => s.setView({ wireframe: v as WireframeMode })}
        options={Object.entries(WIREFRAME_LABELS).map(([value, label]) => ({ value, label }))}
        testId="wireframe-select"
      />
      <div className="flex items-center gap-1" role="group" aria-label="背景色">
        <span className="text-sm text-slate-600 dark:text-slate-300">背景</span>
        {BACKGROUNDS.map((b) => (
          <Button
            key={b.id}
            active={s.background === b.id}
            aria-pressed={s.background === b.id}
            aria-label={`背景: ${b.label}`}
            onClick={() => s.setView({ background: b.id })}
          >
            {b.label}
          </Button>
        ))}
      </div>
      <Toggle label="グリッド" checked={s.showGrid} onChange={(v) => s.setView({ showGrid: v })} />
      <Toggle label="座標軸" checked={s.showAxes} onChange={(v) => s.setView({ showAxes: v })} />
      <Toggle
        label="スケルトン"
        checked={s.showSkeleton}
        onChange={(v) => s.setView({ showSkeleton: v })}
      />
      <Button onClick={s.resetCamera} disabled={!s.hasModel} className="ml-auto">
        ⟲ カメラをリセット
      </Button>
    </div>
  );
}
