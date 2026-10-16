import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { InspectionResult, Level } from '../../../logic/inspection/types';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore, type ViewId } from '../../../store/workbenchStore';
import { Empty, SeverityIcon } from '../primitives';
import { vsc } from '../styles';

const GROUPS: { levels: Level[]; title: string; passed: boolean }[] = [
  { levels: ['ng'], title: 'NG', passed: false },
  { levels: ['warn'], title: '警告', passed: false },
  { levels: ['ok'], title: '合格', passed: true },
  { levels: ['skip'], title: '対象外', passed: true },
];

/** 検品の項目から、関係するサイドバーのビュー。 */
const CATEGORY_VIEW: Record<InspectionResult['category'], ViewId> = {
  ジオメトリ: 'explorer',
  テクスチャ: 'textures',
  UV: 'uv',
  リグ: 'rig',
};

/** 問題パネル（VS Code の「問題」と同じく、重大な順にまとめる）。 */
export function ProblemsPanel() {
  const results = useViewerStore((s) => s.inspection);
  const hasModel = useViewerStore((s) => s.model !== null);
  const showPassed = useWorkbenchStore((s) => s.showPassed);
  const wb = useWorkbenchStore();
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  if (!hasModel) return <Empty>FBX を開くと、検品の結果がここに表示されます。</Empty>;

  const toggle = (id: string) => {
    const next = new Set(openRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenRows(next);
  };

  return (
    <div role="tree" aria-label="問題" className="text-[13px]" data-testid="problems">
      {GROUPS.map((g) => {
        const items = results.filter((r) => g.levels.includes(r.level));
        if (items.length === 0) return null;
        const hidden = g.passed && !showPassed;
        return (
          <div key={g.title} hidden={hidden} data-testid={`problems-group-${g.levels[0]}`}>
            <div className={`flex h-[22px] items-center gap-1.5 px-2 ${vsc.strong}`}>
              <SeverityIcon level={g.levels[0]} />
              <span className="font-semibold">{g.title}</span>
              <span
                className={`rounded-full px-1.5 text-[11px] leading-4 ${vsc.muted} bg-black/5 dark:bg-white/10`}
              >
                {items.length}
              </span>
            </div>
            {items.map((r) => {
              const open = openRows.has(r.id);
              const hasTargets = (r.targets?.length ?? 0) > 0;
              return (
                <div key={r.id} data-testid={`inspection-${r.id}`} data-level={r.level}>
                  <div
                    role="treeitem"
                    aria-expanded={hasTargets ? open : undefined}
                    tabIndex={0}
                    className={`flex min-h-[22px] cursor-pointer items-center gap-1.5 pl-5 pr-2 ${vsc.hover} ${vsc.focus}`}
                    onClick={() => {
                      if (hasTargets) toggle(r.id);
                      if (r.level === 'ng' || r.level === 'warn')
                        wb.showView(CATEGORY_VIEW[r.category]);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && hasTargets && toggle(r.id)}
                  >
                    <span className="w-3.5 shrink-0">
                      {hasTargets &&
                        (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    </span>
                    <SeverityIcon level={r.level} />
                    <span className={`shrink-0 ${vsc.strong}`}>{r.title}</span>
                    <span className={`min-w-0 truncate ${vsc.text}`} title={r.message}>
                      {r.message}
                    </span>
                    <span className={`ml-auto shrink-0 pl-2 text-[12px] ${vsc.muted}`}>{r.id}</span>
                  </div>
                  {open &&
                    r.targets?.map((t) => (
                      <div
                        key={t}
                        className={`flex h-[22px] items-center pl-14 pr-2 text-[12px] ${vsc.muted}`}
                        title={t}
                      >
                        <span className="truncate">{t}</span>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        );
      })}
      {!showPassed && results.every((r) => r.level === 'ok' || r.level === 'skip') && (
        <Empty>
          問題は見つかりませんでした（{results.filter((r) => r.level === 'ok').length}{' '}
          項目が合格）。
        </Empty>
      )}
    </div>
  );
}
