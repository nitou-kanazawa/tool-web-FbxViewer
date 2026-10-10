import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  readPreference,
  resolveTheme,
  systemPrefersDark,
  writePreference,
  type Theme,
  type ThemePreference,
} from './theme';

/** テーマの設定を読み書きし、<html> に反映する。「システム」のときは OS の変更にも追従する。 */
export function useTheme(): {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference());
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    writePreference(next);
    setPreferenceState(next);
  }, []);

  return { preference, theme, setPreference };
}
