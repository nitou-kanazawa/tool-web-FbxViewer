import { useEffect, useMemo, useRef, useState } from 'react';
import { fuzzyFilter } from '../../logic/fuzzyMatch';
import { useWorkbenchStore } from '../../store/workbenchStore';
import type { Command } from './commands';
import { KeyHint } from './primitives';
import { vsc } from './styles';

/** コマンドパレット（Ctrl+Shift+P）。あいまい検索して Enter で実行する。 */
export function CommandPalette({ commands }: { commands: ReadonlyArray<Command> }) {
  const open = useWorkbenchStore((s) => s.paletteOpen);
  const initialQuery = useWorkbenchStore((s) => s.paletteQuery);
  const setOpen = useWorkbenchStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setIndex(0);
  }, [open, initialQuery]);

  const items = useMemo(
    () =>
      fuzzyFilter(
        commands.filter((c) => c.id !== 'workbench.palette' && (!c.enabled || c.enabled())),
        query,
        (c) => `${c.category}: ${c.title}`,
      ).slice(0, 60),
    [commands, query, open], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    void c.run();
  };

  return (
    <div className="fixed inset-0 z-50" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-label="コマンド パレット"
        className="mx-auto mt-[44px] w-[600px] max-w-[calc(100vw-16px)] overflow-hidden rounded-md border border-[#c8c8c8] bg-[#f8f8f8] text-[13px] shadow-[0_0_8px_2px_rgba(0,0,0,0.16)] dark:border-[#454545] dark:bg-[#252526] dark:shadow-[0_0_8px_2px_rgba(0,0,0,0.6)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-1.5">
          <input
            // 開いた瞬間に入力できるよう、マウント時にフォーカスする（すぐに打っても最初の文字が抜けない）
            autoFocus
            value={query}
            aria-label="コマンドを検索"
            placeholder="コマンドを入力してください"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(items[index]?.item);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
              }
            }}
            className={`h-[26px] w-full px-2 ${vsc.input} !border-[#0090f1] dark:!border-[#007fd4]`}
          />
        </div>
        <div
          ref={listRef}
          role="listbox"
          aria-label="コマンド"
          className="max-h-[360px] overflow-y-auto pb-1.5"
        >
          {items.length === 0 && (
            <p className={`px-3 py-1 ${vsc.muted}`}>一致するコマンドはありません</p>
          )}
          {items.map(({ item, match }, i) => {
            const label = `${item.category}: ${item.title}`;
            const hit = new Set(match.positions);
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={i === index}
                data-index={i}
                onMouseMove={() => setIndex(i)}
                onClick={() => run(item)}
                className={`mx-1.5 flex h-[24px] cursor-pointer items-center gap-2 rounded-[3px] px-2 ${i === index ? vsc.selected : vsc.text}`}
              >
                <span className="min-w-0 truncate">
                  {[...label].map((ch, k) => (
                    <span
                      key={k}
                      className={hit.has(k) ? 'font-bold text-[#0066bf] dark:text-[#2aaaff]' : ''}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
                {item.keybindings?.[0] && (
                  <span className="ml-auto shrink-0">
                    <KeyHint keybinding={item.keybindings[0]} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
