import type { ReactNode } from 'react';
import { vsc } from '../styles';

/** タブの下の細いツールバー（VS Code のパンくずの位置）。左にパンくず、右に操作。 */
export function EditorToolbar({
  breadcrumbs,
  children,
}: {
  breadcrumbs: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex h-[26px] shrink-0 items-center gap-2 border-b px-3 text-[12px] ${vsc.border} ${vsc.editor} ${vsc.text}`}
    >
      <div className="flex min-w-0 items-center gap-1 truncate">{breadcrumbs}</div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function Crumbs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <span className={vsc.muted}>›</span>}
          <span className="truncate">{t}</span>
        </span>
      ))}
    </>
  );
}
