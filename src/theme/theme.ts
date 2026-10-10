/**
 * 表示テーマ（ライト / ダーク）の決定と適用。
 * 「システム」は OS の設定（prefers-color-scheme）に従う。
 * 初回描画のちらつきを防ぐため、index.html のインラインスクリプトにも同じ処理がある。
 * ここを変えるときは index.html も合わせて変えること。
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'web-minitools-theme';

const PREFERENCES: ReadonlyArray<ThemePreference> = ['system', 'light', 'dark'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): Theme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/** 保存された設定を読む。読めない環境（プライベートモードなど）では 'system'。 */
export function readPreference(
  storage: Pick<Storage, 'getItem'> | null = safeLocalStorage(),
): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function writePreference(
  preference: ThemePreference,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null = safeLocalStorage(),
) {
  try {
    if (preference === 'system') storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // 保存できなくても表示の切り替えはできるので無視する
  }
}

/** <html> に dark クラスと color-scheme を設定する（フォームやスクロールバーの配色も合わせる）。 */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
