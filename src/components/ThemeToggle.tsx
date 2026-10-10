import { useTheme } from '../theme/useTheme';
import type { ThemePreference } from '../theme/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'システム', icon: '🖥' },
  { value: 'light', label: 'ライト', icon: '☀' },
  { value: 'dark', label: 'ダーク', icon: '☾' },
];

/** 表示テーマの切り替え（システム / ライト / ダーク）。 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="group"
      aria-label="表示テーマ"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={preference === o.value}
          onClick={() => setPreference(o.value)}
          className={`rounded-md px-2 py-1 transition ${
            preference === o.value
              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <span aria-hidden className="mr-1">
            {o.icon}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
