import { useEffect, useSyncExternalStore } from 'react';
import {
  applyTheme,
  readPreference,
  resolveTheme,
  systemPrefersDark,
  writePreference,
  type Theme,
  type ThemePreference,
} from './theme';

/**
 * テーマの設定をアプリ全体で 1 つだけ持つ（切り替えボタンが複数あっても、コマンドから変えても同期する）。
 */
const listeners = new Set<() => void>();
let preference: ThemePreference | null = null;
let systemDark = false;
let mediaWatched = false;

function current(): ThemePreference {
  if (preference === null) preference = readPreference();
  return preference;
}

function notify() {
  applyTheme(resolveTheme(current(), systemDark));
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!mediaWatched && typeof window !== 'undefined' && window.matchMedia) {
    mediaWatched = true;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    systemDark = media.matches;
    media.addEventListener('change', () => {
      systemDark = media.matches;
      notify();
    });
  }
  return () => listeners.delete(listener);
}

/** テーマを変える（React の外からも呼べる）。 */
export function setThemePreference(next: ThemePreference) {
  writePreference(next);
  preference = next;
  notify();
}

/** テーマの設定を読み書きし、<html> に反映する。「システム」のときは OS の変更にも追従する。 */
export function useTheme(): {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
} {
  const pref = useSyncExternalStore(subscribe, current, current);
  const dark = useSyncExternalStore(subscribe, systemPrefersDark, () => false);
  const theme = resolveTheme(pref, dark);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { preference: pref, theme, setPreference: setThemePreference };
}
