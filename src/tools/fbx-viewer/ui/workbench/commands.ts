import { PRESETS } from '../../logic/inspection/presets';
import { inspectionToMarkdown } from '../../logic/report';
import { findPreset } from '../../logic/inspection/presets';
import { SHADING_LABELS, type ShadingMode } from '../../services/DisplayModeManager';
import { useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { setThemePreference } from '../../../../theme/useTheme';
import { MODEL_SAMPLES } from '../samples';
import { addSampleAnimations, cycleWireframe, openSample, toggleWeights } from './actions';
import { openFileDialog } from './fileDialogs';

/**
 * すべての操作の一覧（設計書 §15.4）。コマンドパレットとショートカットの両方がここを使う。
 */
export interface Command {
  id: string;
  /** カテゴリ（「表示」「アニメ」など）。パレットでは「カテゴリ: 名前」と表示する */
  category: string;
  title: string;
  /** "Ctrl+Shift+P" のような表記。複数あってもよい */
  keybindings?: string[];
  /** false を返すときは実行できない（パレットに出さず、ショートカットも効かない） */
  enabled?: () => boolean;
  run: () => void | Promise<void>;
}

const viewer = () => useViewerStore.getState();
const wb = () => useWorkbenchStore.getState();
const hasModel = () => viewer().model !== null;
const hasClip = () => viewer().activeClip !== null;

const SHADING_ORDER: ShadingMode[] = [
  'standard',
  'baseColor',
  'normalMap',
  'white',
  'normals',
  'checker',
  'boneWeight',
];

export function buildCommands(): Command[] {
  return [
    {
      id: 'workbench.palette',
      category: '表示',
      title: 'コマンド パレット',
      keybindings: ['Ctrl+Shift+P', 'F1'],
      run: () => wb().setPaletteOpen(!wb().paletteOpen),
    },
    {
      id: 'file.open',
      category: 'ファイル',
      title: 'ファイルを開く…',
      keybindings: ['Ctrl+O'],
      run: () => openFileDialog('model'),
    },
    ...MODEL_SAMPLES.map<Command>((s) => ({
      id: `file.sample.${s.id}`,
      category: 'サンプル',
      title: `${s.label}を開く`,
      run: () => openSample(s.id),
    })),

    {
      id: 'view.sidebar',
      category: '表示',
      title: 'サイドバーの表示切り替え',
      keybindings: ['Ctrl+B'],
      run: () => wb().toggleSidebar(),
    },
    {
      id: 'view.panel',
      category: '表示',
      title: 'パネルの表示切り替え',
      keybindings: ['Ctrl+J'],
      run: () => wb().togglePanel(),
    },
    {
      id: 'view.inspector',
      category: '表示',
      title: 'インスペクターの表示切り替え',
      keybindings: ['Ctrl+Alt+B'],
      run: () => wb().toggleInspector(),
    },
    {
      id: 'view.explorer',
      category: '表示',
      title: 'エクスプローラーを表示',
      keybindings: ['Ctrl+Shift+E'],
      run: () => showView('explorer'),
    },
    {
      id: 'view.textures',
      category: '表示',
      title: 'テクスチャを表示',
      run: () => showView('textures'),
    },
    { id: 'view.uv', category: '表示', title: 'UV を表示', run: () => showView('uv') },
    { id: 'view.rig', category: '表示', title: 'リグを表示', run: () => showView('rig') },
    {
      id: 'view.animation',
      category: '表示',
      title: 'アニメーションを表示',
      run: () => showView('animation'),
    },
    { id: 'view.settings', category: '表示', title: '設定を表示', run: () => showView('settings') },
    {
      id: 'view.problems',
      category: '表示',
      title: '問題を表示',
      keybindings: ['Ctrl+Shift+M'],
      run: () => wb().showPanel('problems'),
    },
    {
      id: 'view.output',
      category: '表示',
      title: '出力を表示',
      run: () => wb().showPanel('output'),
    },
    {
      id: 'view.timeline',
      category: '表示',
      title: 'タイムラインを表示',
      run: () => wb().showPanel('timeline'),
    },
    {
      id: 'editor.close',
      category: 'エディタ',
      title: 'エディタのタブを閉じる',
      keybindings: ['Alt+W'],
      enabled: () => wb().activeEditor !== 'scene',
      run: () => wb().closeEditor(wb().activeEditor),
    },

    {
      id: 'scene.fit',
      category: '3D ビュー',
      title: 'カメラを全体に合わせる',
      keybindings: ['F'],
      enabled: hasModel,
      run: () => viewer().resetCamera(),
    },
    {
      id: 'scene.wireframe',
      category: '3D ビュー',
      title: 'ワイヤーフレームの切り替え',
      keybindings: ['W'],
      enabled: hasModel,
      run: cycleWireframe,
    },
    ...SHADING_ORDER.map<Command>((mode) => ({
      id: `scene.shading.${mode}`,
      category: '3D ビュー',
      title: `表示: ${SHADING_LABELS[mode]}`,
      enabled: hasModel,
      run: () => (mode === 'boneWeight' ? toggleWeights() : viewer().setView({ shading: mode })),
    })),
    {
      id: 'scene.grid',
      category: '3D ビュー',
      title: 'グリッドの表示切り替え',
      run: () => viewer().setView({ showGrid: !viewer().showGrid }),
    },
    {
      id: 'scene.axes',
      category: '3D ビュー',
      title: '座標軸の表示切り替え',
      run: () => viewer().setView({ showAxes: !viewer().showAxes }),
    },
    {
      id: 'scene.skeleton',
      category: '3D ビュー',
      title: 'スケルトンの表示切り替え',
      enabled: hasModel,
      run: () => viewer().setView({ showSkeleton: !viewer().showSkeleton }),
    },
    {
      id: 'scene.bindPose',
      category: '3D ビュー',
      title: 'バインドポーズに戻す',
      enabled: hasModel,
      run: () => viewer().showBindPose(),
    },
    ...(['dark', 'gray', 'light'] as const).map<Command>((bg) => ({
      id: `scene.background.${bg}`,
      category: '3D ビュー',
      title: `背景: ${{ dark: '暗', gray: '中', light: '明' }[bg]}`,
      run: () => viewer().setView({ background: bg }),
    })),

    {
      id: 'anim.playPause',
      category: 'アニメ',
      title: '再生 / 一時停止',
      keybindings: ['Space'],
      enabled: hasClip,
      run: () => viewer().setPlaying(!viewer().playing),
    },
    {
      id: 'anim.stop',
      category: 'アニメ',
      title: '停止して先頭に戻す',
      enabled: hasClip,
      run: () => viewer().stop(),
    },
    {
      id: 'anim.loop',
      category: 'アニメ',
      title: 'ループの切り替え',
      run: () => viewer().setAnimation({ loop: !viewer().loop }),
    },
    {
      id: 'anim.rootMotion',
      category: 'アニメ',
      title: 'ルートモーションの切り替え',
      run: () => viewer().setAnimation({ rootMotion: !viewer().rootMotion }),
    },
    {
      id: 'anim.add',
      category: 'アニメ',
      title: 'アニメ FBX を追加…',
      run: () => openFileDialog('animation'),
    },
    {
      id: 'anim.samples',
      category: 'アニメ',
      title: 'サンプルアニメを追加',
      run: addSampleAnimations,
    },

    {
      id: 'inspection.copy',
      category: '検品',
      title: '検品結果を Markdown でコピー',
      enabled: hasModel,
      run: copyInspectionMarkdown,
    },
    ...PRESETS.map<Command>((p) => ({
      id: `preset.${p.id}`,
      category: 'プリセット',
      title: p.name,
      run: () => viewer().setPreset(p.id),
    })),

    {
      id: 'theme.system',
      category: 'テーマ',
      title: 'システムに合わせる',
      run: () => setThemePreference('system'),
    },
    {
      id: 'theme.light',
      category: 'テーマ',
      title: 'ライト',
      run: () => setThemePreference('light'),
    },
    {
      id: 'theme.dark',
      category: 'テーマ',
      title: 'ダーク',
      run: () => setThemePreference('dark'),
    },
  ];
}

function showView(id: Parameters<ReturnType<typeof wb>['showView']>[0]) {
  const s = wb();
  if (!(s.sidebarVisible && s.activeView === id)) s.showView(id);
}

export async function copyInspectionMarkdown(): Promise<boolean> {
  const s = viewer();
  if (!s.model || !s.analysis) return false;
  const md = inspectionToMarkdown({
    fileName: s.model.source.fileName,
    presetName: findPreset(s.presetId).name,
    stats: s.analysis.stats,
    results: s.inspection,
  });
  try {
    await navigator.clipboard.writeText(md);
    s.log('info', '検品結果を Markdown でコピーしました');
    return true;
  } catch {
    s.log('warning', 'クリップボードにコピーできませんでした（ブラウザの権限を確認してください）');
    return false;
  }
}
