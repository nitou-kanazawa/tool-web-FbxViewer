/** ワークベンチの大きさとエディタのタブの扱い（設計書 §15.3）。 */

export type PartKind = 'sidebar' | 'inspector' | 'panel';

/** 各領域の最小・最大の大きさ（px）。最大は画面に対する割合でも制限する。 */
export const SIZE_LIMITS: Record<PartKind, { min: number; max: number; maxRatio: number }> = {
  sidebar: { min: 170, max: 600, maxRatio: 0.4 },
  inspector: { min: 220, max: 600, maxRatio: 0.4 },
  panel: { min: 100, max: 800, maxRatio: 0.7 },
};

export const DEFAULT_SIZES: Record<PartKind, number> = {
  sidebar: 260,
  inspector: 300,
  panel: 220,
};

/** 大きさを制限内に収める。viewport はサイドバー・インスペクターなら幅、パネルなら高さ。 */
export function clampSize(kind: PartKind, size: number, viewport: number): number {
  const { min, max, maxRatio } = SIZE_LIMITS[kind];
  const upper = Math.max(min, Math.min(max, Math.floor(viewport * maxRatio)));
  if (!Number.isFinite(size)) return DEFAULT_SIZES[kind];
  return Math.round(Math.max(min, Math.min(upper, size)));
}

export type EditorKind = 'scene' | 'uv' | 'texture';

export interface EditorTab {
  id: string;
  kind: EditorKind;
  title: string;
  /** 対象のオブジェクト（メッシュやテクスチャ）の uuid */
  target?: string;
}

export const SCENE_TAB: EditorTab = { id: 'scene', kind: 'scene', title: '3D ビュー' };

export function editorId(kind: EditorKind, target?: string): string {
  return target ? `${kind}:${target}` : kind;
}

/** タブを開く。同じタブがあればそれを選ぶだけ。新しいタブは今のタブの右に入れる。 */
export function openTab(
  tabs: ReadonlyArray<EditorTab>,
  active: string,
  tab: EditorTab,
): { tabs: EditorTab[]; active: string } {
  if (tabs.some((t) => t.id === tab.id)) return { tabs: [...tabs], active: tab.id };
  const index = tabs.findIndex((t) => t.id === active);
  const next = [...tabs];
  next.splice(index >= 0 ? index + 1 : next.length, 0, tab);
  return { tabs: next, active: tab.id };
}

/** タブを閉じる。3D ビューは閉じない。閉じたのが選択中なら右隣（なければ左隣）を選ぶ。 */
export function closeTab(
  tabs: ReadonlyArray<EditorTab>,
  active: string,
  id: string,
): { tabs: EditorTab[]; active: string } {
  const index = tabs.findIndex((t) => t.id === id);
  if (index < 0 || tabs[index].kind === 'scene') return { tabs: [...tabs], active };
  const next = tabs.filter((t) => t.id !== id);
  if (active !== id) return { tabs: next, active };
  const neighbor = next[index] ?? next[index - 1] ?? next[0];
  return { tabs: next, active: neighbor?.id ?? SCENE_TAB.id };
}
