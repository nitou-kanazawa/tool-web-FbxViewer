/**
 * "Ctrl+Shift+P" のようなキーバインドの表記を解析し、キーボードイベントと照合する（設計書 §15.4）。
 * Ctrl は Mac では ⌘（metaKey）として扱う（VS Code と同じ）。
 */

export interface Keybinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  /** 小文字のキー名（"p"、"f1"、"space"、"escape" など） */
  key: string;
}

export interface KeyEventLike {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function parseKeybinding(text: string): Keybinding {
  const parts = text.split('+').map((p) => p.trim().toLowerCase());
  const key = parts[parts.length - 1];
  return {
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key,
  };
}

/** イベントのキー名を正規化する。Shift や Alt で文字が変わっても、物理キー（code）で照合する。 */
export function eventKey(e: KeyEventLike): string {
  if (e.code?.startsWith('Key')) return e.code.slice(3).toLowerCase();
  if (e.code?.startsWith('Digit')) return e.code.slice(5);
  if (e.key === ' ' || e.code === 'Space') return 'space';
  return e.key.toLowerCase();
}

export function matchesKeybinding(binding: Keybinding, e: KeyEventLike, isMac = false): boolean {
  const ctrl = isMac ? e.metaKey : e.ctrlKey;
  return (
    ctrl === binding.ctrl &&
    e.shiftKey === binding.shift &&
    e.altKey === binding.alt &&
    eventKey(e) === binding.key
  );
}

/** 画面に出す表記（Mac では記号にする）。 */
export function formatKeybinding(text: string, isMac = false): string {
  const b = parseKeybinding(text);
  const key = b.key.length === 1 ? b.key.toUpperCase() : capitalize(b.key);
  if (isMac) {
    return [b.ctrl && '⌘', b.alt && '⌥', b.shift && '⇧', key].filter(Boolean).join('');
  }
  return [b.ctrl && 'Ctrl', b.alt && 'Alt', b.shift && 'Shift', key].filter(Boolean).join('+');
}

/** 修飾キーなしのキーバインドか（入力欄にフォーカスがあるときは使わない）。 */
export function isPlainKey(binding: Keybinding): boolean {
  return !binding.ctrl && !binding.alt && !/^f\d+$/.test(binding.key) && binding.key !== 'escape';
}

function capitalize(s: string): string {
  if (s === 'space') return 'Space';
  if (s === 'escape') return 'Esc';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
