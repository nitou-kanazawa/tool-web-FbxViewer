import { useWorkbenchStore, type ViewId } from '../../store/workbenchStore';
import { VIEWS } from './viewList';
import { vsc } from './styles';
import { AnimationView } from './views/AnimationView';
import { ExplorerView } from './views/ExplorerView';
import { RigView } from './views/RigView';
import { SettingsView } from './views/SettingsView';
import { TexturesView } from './views/TexturesView';
import { UvView } from './views/UvView';

const TITLES: Record<ViewId, string> = {
  ...(Object.fromEntries(VIEWS.map((v) => [v.id, v.label])) as Record<ViewId, string>),
  settings: '設定',
};

export function Sidebar() {
  const view = useWorkbenchStore((s) => s.activeView);
  return (
    <aside
      aria-label={TITLES[view]}
      className={`flex h-full min-w-0 flex-col ${vsc.sidebar} ${vsc.text}`}
      data-testid="sidebar"
    >
      <div className={`flex h-[35px] shrink-0 items-center px-5 ${vsc.sectionHeader} font-normal`}>
        {TITLES[view]}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden text-[13px]">
        {view === 'explorer' && <ExplorerView />}
        {view === 'textures' && <TexturesView />}
        {view === 'uv' && <UvView />}
        {view === 'rig' && <RigView />}
        {view === 'animation' && <AnimationView />}
        {view === 'settings' && <SettingsView />}
      </div>
    </aside>
  );
}
