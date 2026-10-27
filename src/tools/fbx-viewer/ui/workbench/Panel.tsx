import { ChevronDown, CopyCheck, ListFilter, Trash2 } from 'lucide-react';
import { summarize } from '../../logic/inspection/runInspection';
import { useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore, type PanelId } from '../../store/workbenchStore';
import { copyInspectionMarkdown } from './commands';
import { OutputPanel } from './panels/OutputPanel';
import { ProblemsPanel } from './panels/ProblemsPanel';
import { TimelinePanel } from './panels/TimelinePanel';
import { IconButton } from './primitives';
import { vsc } from './styles';

/** 下のパネル（問題・出力・タイムライン）。 */
export function Panel() {
  const active = useWorkbenchStore((s) => s.activePanel);
  const showPanel = useWorkbenchStore((s) => s.showPanel);
  const togglePanel = useWorkbenchStore((s) => s.togglePanel);
  const showPassed = useWorkbenchStore((s) => s.showPassed);
  const setShowPassed = useWorkbenchStore((s) => s.setShowPassed);
  const inspection = useViewerStore((s) => s.inspection);
  const clearLog = useViewerStore((s) => s.clearLog);
  const sum = summarize(inspection);
  const problemCount = sum.ng + sum.warn;

  const tabs: { id: PanelId; label: string; badge?: number }[] = [
    { id: 'problems', label: '問題', badge: problemCount },
    { id: 'output', label: '出力' },
    { id: 'timeline', label: 'タイムライン' },
  ];

  return (
    <section
      aria-label="パネル"
      className={`flex h-full min-h-0 flex-col border-t ${vsc.border} ${vsc.editor} ${vsc.text}`}
    >
      <div className="flex h-[35px] shrink-0 items-center gap-4 px-3">
        <div role="tablist" aria-label="パネル" className="flex h-full items-center gap-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              onClick={() => showPanel(t.id)}
              className={`relative flex h-full items-center gap-1.5 text-[11px] uppercase tracking-wide ${
                active === t.id
                  ? `${vsc.strong} after:absolute after:inset-x-0 after:bottom-1 after:h-px after:bg-current`
                  : `${vsc.muted} hover:text-[#333] dark:hover:text-[#e7e7e7]`
              } ${vsc.focus}`}
            >
              {t.label}
              {t.badge ? (
                <span className="rounded-full bg-[#c4c4c4] px-1.5 text-[10px] leading-4 text-[#333] dark:bg-[#4d4d4d] dark:text-white">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {active === 'problems' && (
            <>
              <IconButton
                icon={ListFilter}
                label={showPassed ? '合格した項目を隠す' : '合格した項目も表示'}
                active={showPassed}
                onClick={() => setShowPassed(!showPassed)}
              />
              <IconButton
                icon={CopyCheck}
                label="検品結果を Markdown でコピー"
                onClick={() => void copyInspectionMarkdown()}
              />
            </>
          )}
          {active === 'output' && (
            <IconButton icon={Trash2} label="出力をクリア" onClick={clearLog} />
          )}
          <IconButton
            icon={ChevronDown}
            label="パネルを閉じる"
            keybinding="Ctrl+J"
            onClick={togglePanel}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {active === 'problems' && <ProblemsPanel />}
        {active === 'output' && <OutputPanel />}
        {active === 'timeline' && <TimelinePanel />}
      </div>
    </section>
  );
}
