import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useViewerStore } from '../../store/viewerStore';
import { SeverityIcon } from './primitives';
import { vsc } from './styles';

/** 警告を自動で閉じるまでの時間（ミリ秒）。エラーは閉じるまで残す。 */
const WARNING_TIMEOUT = 10_000;

/** 右下の通知（VS Code と同じ位置）。内容は出力パネルにも残る。 */
export function Notifications() {
  const messages = useViewerStore((s) => s.messages);
  const dismiss = useViewerStore((s) => s.dismissMessage);
  const visible = messages.filter((m) => !m.dismissed && m.level !== 'info').slice(-3);

  useEffect(() => {
    const timers = visible
      .filter((m) => m.level === 'warning')
      .map((m) =>
        window.setTimeout(() => dismiss(m.id), Math.max(0, m.time + WARNING_TIMEOUT - Date.now())),
      );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [visible, dismiss]);

  if (visible.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-8 right-3 z-40 flex w-[420px] max-w-[calc(100vw-24px)] flex-col gap-2">
      {visible.map((m) => (
        <div
          key={m.id}
          role={m.level === 'error' ? 'alert' : 'status'}
          data-testid={m.level === 'error' ? 'error-message' : 'warning-message'}
          className={`pointer-events-auto flex items-start gap-2 rounded border px-3 py-2.5 text-[13px] shadow-[0_0_8px_2px_rgba(0,0,0,0.16)] ${vsc.border} bg-[#f3f3f3] dark:bg-[#252526] dark:shadow-[0_0_8px_2px_rgba(0,0,0,0.6)] ${vsc.strong}`}
        >
          <span className="mt-0.5">
            <SeverityIcon level={m.level === 'error' ? 'ng' : 'warn'} size={16} />
          </span>
          <span className="min-w-0 flex-1 break-words">{m.text}</span>
          <button
            type="button"
            aria-label="通知を閉じる"
            onClick={() => dismiss(m.id)}
            className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
