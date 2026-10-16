import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  CircleX,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { formatKeybinding } from '../../logic/keybindings';
import { isMac, withKey } from './platform';
import type { Level } from '../../logic/inspection/types';
import { vsc } from './styles';

/** アイコンだけのボタン。aria-label とツールチップを必ず付ける。 */
export function IconButton({
  icon: Icon,
  label,
  keybinding,
  active = false,
  size = 16,
  className = '',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon;
  label: string;
  keybinding?: string;
  active?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={withKey(label, keybinding)}
      className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] disabled:opacity-40 ${
        active ? 'bg-[#0060c0]/15 text-[#0060c0] dark:bg-white/15 dark:text-white' : ''
      } hover:bg-black/10 dark:hover:bg-white/10 ${vsc.focus} ${className}`}
      {...props}
    >
      <Icon size={size} strokeWidth={1.6} />
    </button>
  );
}

/** サイドバーやインスペクターの折りたためる見出し（VS Code のビューのセクション）。 */
export function Section({
  title,
  children,
  actions,
  defaultOpen = true,
  testId,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`border-t first:border-t-0 ${vsc.border}`} data-testid={testId}>
      <div className="group flex h-[22px] items-center pr-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`flex h-full min-w-0 flex-1 items-center gap-0.5 pl-0.5 ${vsc.sectionHeader} ${vsc.strong} ${vsc.focus}`}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="truncate">{title}</span>
        </button>
        {actions && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            {actions}
          </div>
        )}
      </div>
      {open && <div className="pb-1">{children}</div>}
    </section>
  );
}

/** ツリーやリストの 1 行（22px）。 */
export function Row({
  depth = 0,
  selected = false,
  expanded,
  onToggle,
  icon,
  label,
  description,
  trailing,
  onClick,
  onDoubleClick,
  title,
  testId,
}: {
  depth?: number;
  selected?: boolean;
  /** undefined なら展開できない行 */
  expanded?: boolean;
  onToggle?: () => void;
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  title?: string;
  testId?: string;
}) {
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={expanded}
      tabIndex={0}
      title={title}
      data-testid={testId}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (onDoubleClick ?? onClick)?.();
        if (e.key === 'ArrowRight' && expanded === false) onToggle?.();
        if (e.key === 'ArrowLeft' && expanded === true) onToggle?.();
      }}
      className={`group flex h-[22px] cursor-pointer select-none items-center gap-1 pr-2 ${
        selected ? vsc.selected : `${vsc.hover}`
      } ${vsc.focus}`}
      style={{ paddingLeft: 4 + depth * 12 }}
    >
      <span
        className="flex w-4 shrink-0 justify-center"
        onClick={(e) => {
          if (expanded === undefined) return;
          e.stopPropagation();
          onToggle?.();
        }}
      >
        {expanded === undefined ? null : expanded ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </span>
      {icon && <span className="flex w-4 shrink-0 justify-center">{icon}</span>}
      <span className="min-w-0 truncate">{label}</span>
      {description && (
        <span className={`min-w-0 truncate text-[12px] ${selected ? 'opacity-80' : vsc.muted}`}>
          {description}
        </span>
      )}
      {trailing && <span className="ml-auto flex shrink-0 items-center gap-0.5">{trailing}</span>}
    </div>
  );
}

/** プロパティの一覧（インスペクター用）。 */
export function PropertyGrid({ rows, testId }: { rows: [string, ReactNode][]; testId?: string }) {
  return (
    <dl
      className="grid grid-cols-[minmax(84px,40%)_1fr] gap-x-2 px-3 text-[12px] leading-[22px]"
      data-testid={testId}
    >
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className={`truncate ${vsc.muted}`} title={k}>
            {k}
          </dt>
          <dd className={`min-w-0 break-all tabular-nums ${vsc.strong}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function VsSelect({
  label,
  value,
  onChange,
  options,
  hideLabel = true,
  testId,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; group?: string }[];
  hideLabel?: boolean;
  testId?: string;
  className?: string;
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  const renderOptions = (g: string) =>
    options
      .filter((o) => (o.group ?? '') === g)
      .map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ));
  return (
    <label
      className={`inline-flex min-w-0 items-center gap-1.5 text-[12px] ${vsc.text} ${className}`}
    >
      <span className={hideLabel ? 'sr-only' : 'shrink-0'}>{label}</span>
      <select
        aria-label={label}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-[22px] min-w-0 px-1 text-[12px] ${vsc.input}`}
      >
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {renderOptions(g)}
            </optgroup>
          ) : (
            renderOptions(g)
          ),
        )}
      </select>
    </label>
  );
}

export function VsCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 text-[12px] ${vsc.text}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#007acc]"
      />
      {label}
    </label>
  );
}

const LEVEL_ICON: Record<Level | 'info', { icon: LucideIcon; className: string; label: string }> = {
  ng: { icon: CircleX, className: vsc.error, label: 'NG' },
  warn: { icon: TriangleAlert, className: vsc.warning, label: '警告' },
  ok: { icon: CircleCheck, className: vsc.ok, label: 'OK' },
  skip: { icon: CircleMinus, className: vsc.muted, label: '対象外' },
  info: { icon: Info, className: vsc.info, label: '情報' },
};

/** 判定のアイコン（色だけで区別しないよう、読み上げ用の文字も付ける）。 */
export function SeverityIcon({ level, size = 14 }: { level: Level | 'info'; size?: number }) {
  const s = LEVEL_ICON[level];
  const Icon = s.icon;
  return (
    <span className={`inline-flex shrink-0 ${s.className}`} title={s.label}>
      <Icon size={size} strokeWidth={2} aria-hidden />
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-[#cecece] bg-[#f3f3f3] px-1 font-sans text-[11px] text-[#555] shadow-[inset_0_-1px_0_#cecece] dark:border-[#555] dark:bg-[#333] dark:text-[#ccc] dark:shadow-[inset_0_-1px_0_#555]">
      {children}
    </kbd>
  );
}

export function KeyHint({ keybinding }: { keybinding: string }) {
  const text = formatKeybinding(keybinding, isMac);
  const parts = isMac ? [text] : text.split('+');
  return (
    <span className="inline-flex gap-0.5">
      {parts.map((p) => (
        <Kbd key={p}>{p}</Kbd>
      ))}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={`px-5 py-3 text-[12px] leading-5 ${vsc.muted}`}>{children}</div>;
}
