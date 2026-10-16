import { useEffect, useRef } from 'react';
import { useViewerStore, type LogMessage } from '../../../store/viewerStore';
import { vsc } from '../styles';

const LEVEL_CLASS: Record<LogMessage['level'], string> = {
  error: vsc.error,
  warning: vsc.warning,
  info: vsc.text,
};
const LEVEL_TEXT: Record<LogMessage['level'], string> = {
  error: 'エラー',
  warning: '警告',
  info: '情報',
};

/** 出力パネル（読み込みの記録やローダーの診断）。新しい行が来たら一番下までスクロールする。 */
export function OutputPanel() {
  const messages = useViewerStore((s) => s.messages);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages.length]);

  return (
    <div className="px-3 py-1 font-mono text-[12px] leading-[18px]" data-testid="output">
      {messages.length === 0 && <p className={vsc.muted}>出力はまだありません。</p>}
      {messages.map((m) => (
        <div key={m.id} className={`whitespace-pre-wrap break-all ${LEVEL_CLASS[m.level]}`}>
          <span className={vsc.muted}>[{new Date(m.time).toLocaleTimeString('ja-JP')}]</span> [
          {LEVEL_TEXT[m.level]}] {m.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
