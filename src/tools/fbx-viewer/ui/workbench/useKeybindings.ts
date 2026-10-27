import { useEffect } from 'react';
import { isPlainKey, matchesKeybinding, parseKeybinding } from '../../logic/keybindings';
import type { Command } from './commands';
import { isMac } from './platform';

/** 入力中（テキスト欄・選択肢・スライダーなど）かどうか。 */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** コマンドのキーバインドを window に登録する。 */
export function useKeybindings(commands: ReadonlyArray<Command>) {
  useEffect(() => {
    const bindings = commands.flatMap((c) =>
      (c.keybindings ?? []).map((k) => ({ command: c, binding: parseKeybinding(k) })),
    );
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return;
      for (const { command, binding } of bindings) {
        if (!matchesKeybinding(binding, e, isMac)) continue;
        if (isPlainKey(binding) && isTyping(e.target)) return;
        // フォーカス中のボタンを Space で押さないよう、修飾キーなしでも既定の動作は止める
        if (command.enabled && !command.enabled()) return;
        e.preventDefault();
        void command.run();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commands]);
}
