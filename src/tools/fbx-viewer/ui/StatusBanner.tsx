import { useViewerStore } from '../store/viewerStore';

/** エラーとお知らせ（無視したファイルなど）を表示する。 */
export function StatusBanner() {
  const error = useViewerStore((s) => s.error);
  const animationError = useViewerStore((s) => s.animationError);
  const notices = useViewerStore((s) => s.notices);
  const dismiss = useViewerStore((s) => s.dismissNotices);
  if (!error && !animationError && notices.length === 0) return null;
  return (
    <div className="space-y-2">
      {[error, animationError].filter(Boolean).map((message) => (
        <div
          key={message}
          role="alert"
          data-testid="error-message"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <span>{message}</span>
          <button
            type="button"
            aria-label="閉じる"
            onClick={dismiss}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
      {notices.map((n) => (
        <div
          key={n}
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <span>{n}</span>
          <button
            type="button"
            aria-label="閉じる"
            onClick={dismiss}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
