import { Bone, Grid2x2, Loader2, Scan, Axis3d } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { Object3D } from 'three';
import {
  DEFAULT_LIGHT_ANGLE,
  LIGHTING,
  LIGHTING_ORDER,
  type LightingPreset,
} from '../../../logic/lighting';
import {
  WIREFRAME_LABELS,
  type ShadingMode,
  type WireframeMode,
} from '../../../services/DisplayModeManager';
import { shadingOptions } from '../shadingOptions';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { ViewerCanvas } from '../../../viewer/ViewerCanvas';
import { MODEL_SAMPLES } from '../../samples';
import { openSample, toggleWeights } from '../actions';
import { openFileDialog } from '../fileDialogs';
import { IconButton, KeyHint, VsSelect } from '../primitives';
import { vsc } from '../styles';
import { Crumbs, EditorToolbar } from './EditorToolbar';
import { useElementSize } from './useElementSize';

/** 3D ビュー。タブを切り替えても描画の状態を保つため、常にマウントしておく。 */
export function SceneEditor() {
  const s = useViewerStore();
  const selection = useWorkbenchStore((w) => w.selection);
  const rootRef = useRef<HTMLDivElement>(null);
  // ツールバーの操作が多いので、狭いときはパンくずを出さない（ファイル名はタイトルバーにある）
  const narrow = useElementSize(rootRef).width < 1000;

  const crumbs = useMemo(() => {
    if (!s.model) return ['3D ビュー'];
    const items = [s.model.source.fileName];
    if (selection.kind === 'node') {
      const obj = s.model.root.getObjectByProperty('uuid', selection.uuid);
      if (obj) items.push(...pathOf(obj, s.model.root));
    }
    return items;
  }, [s.model, selection]);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col">
      <EditorToolbar breadcrumbs={narrow ? null : <Crumbs items={crumbs} />}>
        <VsSelect
          label="シェーディング"
          value={s.shading}
          onChange={(v) =>
            v === 'boneWeight' ? toggleWeights() : s.setView({ shading: v as ShadingMode })
          }
          options={shadingOptions()}
          testId="shading-select"
        />
        <VsSelect
          label="ライティング"
          value={s.lighting}
          onChange={(v) => s.setView({ lighting: v as LightingPreset })}
          options={LIGHTING_ORDER.map((id) => ({
            value: id,
            label: `ライト: ${LIGHTING[id].label}`,
          }))}
          testId="lighting-select"
        />
        <LightAngle />
        <VsSelect
          label="ワイヤーフレーム"
          value={s.wireframe}
          onChange={(v) => s.setView({ wireframe: v as WireframeMode })}
          options={Object.entries(WIREFRAME_LABELS).map(([value, label]) => ({
            value,
            label: `ワイヤー: ${label}`,
          }))}
          testId="wireframe-select"
        />
        <span className={`mx-0.5 h-4 border-l ${vsc.border}`} />
        <IconButton
          icon={Grid2x2}
          label="グリッド"
          active={s.showGrid}
          onClick={() => s.setView({ showGrid: !s.showGrid })}
        />
        <IconButton
          icon={Axis3d}
          label="座標軸"
          active={s.showAxes}
          onClick={() => s.setView({ showAxes: !s.showAxes })}
        />
        <IconButton
          icon={Bone}
          label="スケルトン"
          active={s.showSkeleton}
          onClick={() => s.setView({ showSkeleton: !s.showSkeleton })}
        />
        <IconButton
          icon={Scan}
          label="カメラを全体に合わせる"
          keybinding="F"
          disabled={!s.model}
          onClick={s.resetCamera}
        />
      </EditorToolbar>
      <div className="relative min-h-0 flex-1 bg-[#232323]" data-testid="scene-view">
        <ViewerCanvas />
        {!s.model && s.status !== 'loading' && <Welcome />}
        {s.status === 'loading' && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-[13px] text-white"
          >
            <Loader2 size={16} className="animate-spin" /> 読み込み中…
          </div>
        )}
      </div>
    </div>
  );
}

/** 何も開いていないときの案内（VS Code のウェルカム画面のように、操作とショートカットを並べる）。 */
function Welcome() {
  const hints: [string, string][] = [
    ['コマンド パレット', 'Ctrl+Shift+P'],
    ['ファイルを開く', 'Ctrl+O'],
    ['サイドバー / パネル', 'Ctrl+B'],
    ['再生 / 一時停止', 'Space'],
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]/80 p-6 text-[13px] text-[#cccccc] backdrop-blur-[2px]">
      <div className="w-full max-w-md space-y-5">
        <div>
          <p className="text-[20px] font-light text-white">FBX ビューア</p>
          <p className="mt-1 text-[#9d9d9d]">
            ここに FBX をドラッグ＆ドロップ（テクスチャ画像も一緒に）
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#9d9d9d]">開始</p>
          <button
            type="button"
            className="block text-[#3794ff] hover:underline"
            onClick={() => openFileDialog('model')}
          >
            ファイルを開く…
          </button>
          {MODEL_SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="block text-[#3794ff] hover:underline"
              onClick={() => void openSample(s.id)}
            >
              サンプル: {s.label}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#9d9d9d]">
            ショートカット
          </p>
          {hints.map(([label, key]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <KeyHint keybinding={key} />
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[#9d9d9d]">
          ファイルはブラウザの中だけで処理され、外部には送信されません。
        </p>
      </div>
    </div>
  );
}

function pathOf(obj: Object3D, root: Object3D): string[] {
  const names: string[] = [];
  let cur: Object3D | null = obj;
  while (cur && cur !== root) {
    names.unshift(cur.name || '(名前なし)');
    cur = cur.parent;
  }
  return names.length > 4 ? ['…', ...names.slice(-3)] : names;
}

/** ライトの向き（水平方向に回す）。法線マップや陰影の確認に使う。 */
function LightAngle() {
  const angle = useViewerStore((s) => s.lightAngle);
  const lighting = useViewerStore((s) => s.lighting);
  const setView = useViewerStore((s) => s.setView);
  const disabled = LIGHTING[lighting].key.intensity === 0;
  return (
    <label
      className={`inline-flex items-center gap-1 text-[12px] ${vsc.text}`}
      title="ライトの向き（ダブルクリックで元に戻す）"
    >
      <span aria-hidden className={disabled ? 'opacity-40' : ''}>
        ☀
      </span>
      <input
        type="range"
        aria-label="ライトの向き"
        min={-180}
        max={180}
        step={5}
        value={angle}
        disabled={disabled}
        onChange={(e) => setView({ lightAngle: Number(e.target.value) })}
        onDoubleClick={() => setView({ lightAngle: DEFAULT_LIGHT_ANGLE })}
        className="h-1 w-20 accent-[#007acc] disabled:opacity-40"
        data-testid="light-angle"
      />
    </label>
  );
}
