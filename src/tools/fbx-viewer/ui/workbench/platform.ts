import { formatKeybinding } from '../../logic/keybindings';

export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** ツールチップ用に「名前 (Ctrl+B)」の形にする。 */
export function withKey(label: string, keybinding?: string): string {
  return keybinding ? `${label} (${formatKeybinding(keybinding, isMac)})` : label;
}
