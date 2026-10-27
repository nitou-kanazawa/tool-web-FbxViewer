import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_SIZES,
  SCENE_TAB,
  closeTab,
  openTab,
  type EditorTab,
  type PartKind,
} from '../logic/workbenchLayout';

/**
 * 画面の形だけの状態（設計書 §15.2）。モデルやアニメなどのドメインの状態は viewerStore にある。
 */

export type ViewId = 'explorer' | 'textures' | 'uv' | 'rig' | 'animation' | 'settings';
export type PanelId = 'problems' | 'output' | 'timeline';

export type Selection =
  | { kind: 'model' }
  | { kind: 'node'; uuid: string }
  | { kind: 'material'; uuid: string }
  | { kind: 'texture'; uuid: string }
  | { kind: 'clip'; assetId: string; clipIndex: number };

interface WorkbenchState {
  activeView: ViewId;
  sidebarVisible: boolean;
  inspectorVisible: boolean;
  panelVisible: boolean;
  activePanel: PanelId;
  sizes: Record<PartKind, number>;
  editors: EditorTab[];
  activeEditor: string;
  selection: Selection;
  paletteOpen: boolean;
  /** パレットを開いたときに最初から入れておく検索語 */
  paletteQuery: string;
  /** 問題パネルで、合格・対象外の項目も表示するか */
  showPassed: boolean;

  showView(id: ViewId): void;
  toggleSidebar(): void;
  toggleInspector(): void;
  togglePanel(): void;
  showPanel(id: PanelId): void;
  setSize(kind: PartKind, size: number): void;
  openEditor(tab: EditorTab): void;
  closeEditor(id: string): void;
  activateEditor(id: string): void;
  select(selection: Selection): void;
  setPaletteOpen(open: boolean, query?: string): void;
  setShowPassed(show: boolean): void;
  /** モデルを差し替えたとき：前のモデルを指すタブと選択を消す */
  resetForNewModel(): void;
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      activeView: 'explorer',
      sidebarVisible: true,
      inspectorVisible: true,
      panelVisible: true,
      activePanel: 'problems',
      sizes: { ...DEFAULT_SIZES },
      editors: [SCENE_TAB],
      activeEditor: SCENE_TAB.id,
      selection: { kind: 'model' },
      paletteOpen: false,
      paletteQuery: '',
      showPassed: false,

      showView(id) {
        const s = get();
        // VS Code と同じく、表示中のビューのアイコンをもう一度押すとサイドバーを閉じる
        if (s.sidebarVisible && s.activeView === id) set({ sidebarVisible: false });
        else set({ activeView: id, sidebarVisible: true });
      },
      toggleSidebar: () => set({ sidebarVisible: !get().sidebarVisible }),
      toggleInspector: () => set({ inspectorVisible: !get().inspectorVisible }),
      togglePanel: () => set({ panelVisible: !get().panelVisible }),
      showPanel: (id) => set({ activePanel: id, panelVisible: true }),
      setSize: (kind, size) => set({ sizes: { ...get().sizes, [kind]: size } }),

      openEditor(tab) {
        const { editors, activeEditor } = get();
        const next = openTab(editors, activeEditor, tab);
        set({ editors: next.tabs, activeEditor: next.active });
      },
      closeEditor(id) {
        const { editors, activeEditor } = get();
        const next = closeTab(editors, activeEditor, id);
        set({ editors: next.tabs, activeEditor: next.active });
      },
      activateEditor: (id) => set({ activeEditor: id }),
      select: (selection) => set({ selection }),
      setPaletteOpen: (open, query = '') => set({ paletteOpen: open, paletteQuery: query }),
      setShowPassed: (show) => set({ showPassed: show }),

      resetForNewModel() {
        set({ editors: [SCENE_TAB], activeEditor: SCENE_TAB.id, selection: { kind: 'model' } });
      },
    }),
    {
      name: 'fbx-viewer-workbench',
      storage: createJSONStorage(() => localStorage),
      // 画面の配置だけを保存する（タブや選択はモデルごとなので保存しない）
      partialize: (s) => ({
        activeView: s.activeView,
        sidebarVisible: s.sidebarVisible,
        inspectorVisible: s.inspectorVisible,
        panelVisible: s.panelVisible,
        activePanel: s.activePanel,
        sizes: s.sizes,
        showPassed: s.showPassed,
      }),
    },
  ),
);
