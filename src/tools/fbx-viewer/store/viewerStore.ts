import type { AnimationClip } from 'three';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toErrorMessage } from '../errors';
import { MemoryAnimationRepository } from '../infra/AnimationRepository';
import { IdbAnimationRepository, isIndexedDbAvailable } from '../infra/IdbAnimationRepository';
import type { FileLike, LoadedModel } from '../infra/FbxModelLoader';
import type { MatchReport } from '../logic/boneMatching';
import { DEFAULT_PRESET_ID, findPreset } from '../logic/inspection/presets';
import type { InspectionResult, TextureFacts } from '../logic/inspection/types';
import {
  AnimationLibrary,
  embeddedAsset,
  prepareClip,
  rigInfoOf,
  type AnimationAsset,
  type RigInfo,
} from '../services/AnimationService';
import {
  analyzeModel,
  collectTextureFacts,
  inspect,
  type ModelAnalysis,
} from '../services/analyzeModel';
import type { ShadingMode, WireframeMode } from '../services/DisplayModeManager';
import { ModelSession } from '../services/ModelSession';

export type Background = 'dark' | 'gray' | 'light';
export type PanelTab = 'overview' | 'textures' | 'uv' | 'rig';

export interface ClipRef {
  assetId: string;
  clipIndex: number;
}

interface ModelState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  notices: string[];
  model: LoadedModel | null;
  analysis: ModelAnalysis | null;
  rig: RigInfo | null;
  textures: TextureFacts[] | undefined;
  inspection: InspectionResult[];
  /** モデルが変わるたびに増える（カメラ合わせなどの合図） */
  modelVersion: number;
}

interface ViewState {
  presetId: string;
  background: Background;
  showGrid: boolean;
  showAxes: boolean;
  showSkeleton: boolean;
  shading: ShadingMode;
  wireframe: WireframeMode;
  tab: PanelTab;
  selectedBoneUuid: string | null;
  cameraResetToken: number;
  bindPoseToken: number;
}

interface AnimationState {
  libraryReady: boolean;
  libraryPersistent: boolean;
  library: AnimationAsset[];
  libraryBusy: boolean;
  animationError: string | null;
  selectedClip: ClipRef | null;
  activeClip: AnimationClip | null;
  matchReport: MatchReport | null;
  playing: boolean;
  loop: boolean;
  speed: number;
  rootMotion: boolean;
  currentTime: number;
  seekRequest: { time: number; token: number } | null;
  fps: number;
}

interface Actions {
  openFiles(files: File[]): Promise<void>;
  setPreset(id: string): void;
  setView(patch: Partial<ViewState>): void;
  resetCamera(): void;
  dismissNotices(): void;
  initLibrary(): Promise<void>;
  addAnimations(files: FileLike[]): Promise<void>;
  removeAnimation(id: string): Promise<void>;
  selectClip(ref: ClipRef | null): void;
  setPlaying(playing: boolean): void;
  stop(): void;
  setAnimation(patch: Partial<Pick<AnimationState, 'loop' | 'speed' | 'rootMotion' | 'fps'>>): void;
  seek(time: number): void;
  reportTime(time: number): void;
  showBindPose(): void;
}

export type ViewerState = ModelState & ViewState & AnimationState & Actions;

const session = new ModelSession();
let library: AnimationLibrary | null = null;

/** 選べるクリップの一覧（モデル内蔵 → ライブラリの順）。 */
export function availableAssets(s: Pick<ViewerState, 'model' | 'library'>): AnimationAsset[] {
  const embedded = s.model ? embeddedAsset(s.model) : null;
  return embedded ? [embedded, ...s.library] : s.library;
}

function findAsset(s: ViewerState, id: string): AnimationAsset | undefined {
  return availableAssets(s).find((a) => a.id === id);
}

export const useViewerStore = create<ViewerState>()(
  persist(
    (set, get) => {
      /** 選択中のクリップをモデル用に変換し直す。 */
      const rebuildClip = () => {
        const s = get();
        if (!s.selectedClip || !s.model || !s.rig) {
          set({ activeClip: null, matchReport: null });
          return;
        }
        const asset = findAsset(s, s.selectedClip.assetId);
        if (!asset) {
          set({ activeClip: null, matchReport: null, selectedClip: null, playing: false });
          return;
        }
        const { clip, report } = prepareClip(asset, s.selectedClip.clipIndex, s.rig, s.rootMotion);
        set({
          activeClip: clip,
          matchReport: report,
          playing: clip ? s.playing : false,
          currentTime: 0,
        });
      };

      const reinspect = () => {
        const s = get();
        if (!s.model || !s.analysis) return;
        set({ inspection: inspect(s.model, s.analysis, findPreset(s.presetId), s.textures) });
      };

      return {
        // ---- モデル ----
        status: 'idle',
        error: null,
        notices: [],
        model: null,
        analysis: null,
        rig: null,
        textures: undefined,
        inspection: [],
        modelVersion: 0,

        // ---- 表示 ----
        presetId: DEFAULT_PRESET_ID,
        background: 'dark',
        showGrid: true,
        showAxes: true,
        showSkeleton: false,
        shading: 'standard',
        wireframe: 'off',
        tab: 'overview',
        selectedBoneUuid: null,
        cameraResetToken: 0,
        bindPoseToken: 0,

        // ---- アニメ ----
        libraryReady: false,
        libraryPersistent: false,
        library: [],
        libraryBusy: false,
        animationError: null,
        selectedClip: null,
        activeClip: null,
        matchReport: null,
        playing: false,
        loop: true,
        speed: 1,
        rootMotion: false,
        currentTime: 0,
        seekRequest: null,
        fps: 30,

        async openFiles(files) {
          set({ status: 'loading', error: null, notices: [] });
          try {
            const result = await session.open(files);
            if (!result) return; // 次の読み込みに追い越された
            const { model, notices } = result;
            const analysis = analyzeModel(model);
            const rig = rigInfoOf(model.root);
            const prev = get();
            // 選択中のクリップは、同じアセットがあれば引き継ぐ（モデル内蔵は差し替わる）
            const keepClip =
              prev.selectedClip && prev.selectedClip.assetId !== 'embedded'
                ? prev.selectedClip
                : model.root.animations.length > 0
                  ? { assetId: 'embedded', clipIndex: 0 }
                  : null;
            set({
              status: 'ready',
              model,
              analysis,
              rig,
              notices,
              textures: undefined,
              selectedBoneUuid: null,
              // ボーンの選択はモデルごとなので、ウェイト表示は通常表示に戻す
              shading: prev.shading === 'boneWeight' ? 'standard' : prev.shading,
              modelVersion: prev.modelVersion + 1,
              selectedClip: keepClip,
              currentTime: 0,
            });
            reinspect();
            rebuildClip();
            model.texturesReady.then(() => {
              if (get().model !== model) return;
              set({ textures: collectTextureFacts(model) });
              reinspect();
            });
          } catch (e) {
            // 失敗しても直前のモデルは残す（NF-06）
            set({ status: get().model ? 'ready' : 'error', error: toErrorMessage(e) });
          }
        },

        setPreset(id) {
          set({ presetId: findPreset(id).id });
          reinspect();
        },

        setView(patch) {
          set(patch);
        },

        resetCamera() {
          set({ cameraResetToken: get().cameraResetToken + 1 });
        },

        dismissNotices() {
          set({ notices: [], error: null, animationError: null });
        },

        async initLibrary() {
          if (library) return;
          const persistent = await isIndexedDbAvailable();
          library = new AnimationLibrary(
            persistent ? new IdbAnimationRepository() : new MemoryAnimationRepository(),
          );
          const { assets, errors } = await library.loadAll();
          set({
            libraryReady: true,
            libraryPersistent: persistent,
            library: assets,
            animationError: errors.length ? `読み込めなかったアニメ: ${errors.join(' / ')}` : null,
          });
        },

        async addAnimations(files) {
          if (!library) await get().initLibrary();
          set({ libraryBusy: true, animationError: null });
          const added: AnimationAsset[] = [];
          const errors: string[] = [];
          for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.fbx')) {
              errors.push(`${file.name}: FBX ではありません`);
              continue;
            }
            try {
              added.push(await library!.add(file));
            } catch (e) {
              errors.push(`${file.name}: ${toErrorMessage(e)}`);
            }
          }
          set({
            libraryBusy: false,
            library: [...get().library, ...added],
            animationError: errors.length ? errors.join(' / ') : null,
          });
          // 追加したアニメをすぐ確認できるよう、最初のクリップを選んで再生する
          if (added.length > 0) {
            get().selectClip({ assetId: added[0].id, clipIndex: 0 });
          }
        },

        async removeAnimation(id) {
          await library?.remove(id);
          const s = get();
          set({ library: s.library.filter((a) => a.id !== id) });
          if (s.selectedClip?.assetId === id) get().selectClip(null);
        },

        selectClip(ref) {
          set({ selectedClip: ref, playing: ref !== null, currentTime: 0 });
          rebuildClip();
        },

        setPlaying(playing) {
          set({ playing: playing && get().activeClip !== null });
        },

        stop() {
          set({ playing: false });
          get().seek(0);
        },

        setAnimation(patch) {
          const rootChanged =
            patch.rootMotion !== undefined && patch.rootMotion !== get().rootMotion;
          set(patch);
          if (rootChanged) rebuildClip();
        },

        seek(time) {
          const token = (get().seekRequest?.token ?? 0) + 1;
          set({ seekRequest: { time, token }, currentTime: time });
        },

        reportTime(time) {
          set({ currentTime: time });
        },

        showBindPose() {
          set({ playing: false, bindPoseToken: get().bindPoseToken + 1 });
        },
      };
    },
    {
      name: 'fbx-viewer-settings',
      storage: createJSONStorage(() => localStorage),
      // 表示の設定だけを保存する（F-0-03）
      partialize: (s) => ({
        presetId: s.presetId,
        background: s.background,
        showGrid: s.showGrid,
        showAxes: s.showAxes,
        loop: s.loop,
        speed: s.speed,
        rootMotion: s.rootMotion,
      }),
    },
  ),
);

/** テスト用: ストアとセッションを初期状態に戻す。 */
export function resetViewerSessionForTest() {
  session.dispose();
  library = null;
}
