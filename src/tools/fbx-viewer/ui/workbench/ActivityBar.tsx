import { Settings, type LucideIcon } from 'lucide-react';
import { VIEWS } from './viewList';
import { useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore, type ViewId } from '../../store/workbenchStore';
import { withKey } from './platform';
import { vsc } from './styles';

/** 左端のアイコン列。アクティブなアイコンをもう一度押すとサイドバーを閉じる。 */
export function ActivityBar() {
  const activeView = useWorkbenchStore((s) => s.activeView);
  const visible = useWorkbenchStore((s) => s.sidebarVisible);
  const showView = useWorkbenchStore((s) => s.showView);
  const clipCount = useViewerStore(
    (s) => s.library.length + (s.model?.root.animations.length ?? 0),
  );

  const item = (
    v: { id: ViewId; label: string; icon: LucideIcon; keybinding?: string },
    badge?: number,
  ) => {
    const active = visible && activeView === v.id;
    const Icon = v.icon;
    return (
      <button
        key={v.id}
        type="button"
        role="tab"
        aria-selected={active}
        aria-label={v.label}
        title={withKey(v.label, v.keybinding)}
        onClick={() => showView(v.id)}
        className={`relative flex h-12 w-12 items-center justify-center ${
          active ? 'text-white' : 'text-white/40 hover:text-white'
        } ${vsc.focus}`}
      >
        {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-white" />}
        <Icon size={24} strokeWidth={1.5} />
        {badge ? (
          <span className="absolute bottom-1.5 right-1.5 min-w-[16px] rounded-full bg-[#007acc] px-1 text-center text-[9px] font-semibold leading-4 text-white">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <nav
      role="tablist"
      aria-label="ビュー"
      aria-orientation="vertical"
      className={`flex w-12 shrink-0 flex-col ${vsc.activity}`}
    >
      {VIEWS.map((v) => item(v, v.id === 'animation' ? clipCount : undefined))}
      <div className="mt-auto">{item({ id: 'settings', label: '設定', icon: Settings })}</div>
    </nav>
  );
}
