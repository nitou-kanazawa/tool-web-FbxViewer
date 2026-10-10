import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Level } from '../../logic/inspection/types';

export function Button({
  className = '',
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-sky-500 bg-sky-500 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      } ${className}`}
      {...props}
    />
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; group?: string }[];
  hideLabel?: boolean;
  testId?: string;
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
      <select
        aria-label={label}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ) : (
            options
              .filter((o) => !o.group)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
          ),
        )}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-sky-500"
      />
      {label}
    </label>
  );
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

const LEVEL_STYLE: Record<Level, { icon: string; label: string; className: string }> = {
  ok: { icon: '✅', label: 'OK', className: 'text-emerald-700 dark:text-emerald-400' },
  warn: { icon: '⚠️', label: '警告', className: 'text-amber-700 dark:text-amber-400' },
  ng: { icon: '❌', label: 'NG', className: 'text-red-700 dark:text-red-400' },
  skip: { icon: '➖', label: '対象外', className: 'text-slate-500 dark:text-slate-400' },
};

/** 検品結果の判定。色だけで区別しないよう、アイコンと文字も出す（設計書 §6.3）。 */
export function LevelBadge({ level }: { level: Level }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${s.className}`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {children}
    </p>
  );
}
