import {
  THEME_STORAGE_KEY,
  applyTheme,
  readPreference,
  resolveTheme,
  writePreference,
} from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('resolveTheme', () => {
  it.each([
    ['system', true, 'dark'],
    ['system', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('%s（OS がダーク: %s）→ %s', (pref, systemDark, expected) => {
    expect(resolveTheme(pref, systemDark)).toBe(expected);
  });
});

describe('readPreference / writePreference', () => {
  it('保存した設定を読み書きする。system は保存を消す', () => {
    const storage = memoryStorage();
    writePreference('dark', storage);
    expect(readPreference(storage)).toBe('dark');
    writePreference('system', storage);
    expect(storage.data.has(THEME_STORAGE_KEY)).toBe(false);
    expect(readPreference(storage)).toBe('system');
  });

  it('不正な値や読めない環境では system', () => {
    expect(readPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'pink' }))).toBe('system');
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(readPreference(broken)).toBe('system');
    expect(readPreference(null)).toBe('system');
  });
});

describe('applyTheme', () => {
  it('dark クラスと color-scheme を設定する', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
    applyTheme('light', root);
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });
});
