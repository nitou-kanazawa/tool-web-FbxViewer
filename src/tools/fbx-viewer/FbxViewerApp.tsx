import { useEffect } from 'react';
import { useViewerStore, type PanelTab } from './store/viewerStore';
import { AnimationBar } from './ui/animation/AnimationBar';
import { DropZone } from './ui/DropZone';
import { HeaderBar } from './ui/HeaderBar';
import { OverviewPanel } from './ui/panels/OverviewPanel';
import { RigPanel } from './ui/panels/RigPanel';
import { TexturePanel } from './ui/panels/TexturePanel';
import { UvPanel } from './ui/panels/UvPanel';
import { StatusBanner } from './ui/StatusBanner';
import { ViewerToolbar } from './ui/ViewerToolbar';
import { ViewerCanvas } from './viewer/ViewerCanvas';

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'overview', label: '概要・検品' },
  { id: 'textures', label: 'テクスチャ' },
  { id: 'uv', label: 'UV' },
  { id: 'rig', label: 'リグ' },
];

export default function FbxViewerApp() {
  const tab = useViewerStore((s) => s.tab);
  const setView = useViewerStore((s) => s.setView);
  const initLibrary = useViewerStore((s) => s.initLibrary);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  return (
    <div className="space-y-3">
      <HeaderBar />
      <StatusBanner />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-2">
          <DropZone>
            <ViewerCanvas />
          </DropZone>
          <ViewerToolbar />
          <AnimationBar />
        </div>
        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div
            role="tablist"
            aria-label="情報パネル"
            className="flex border-b border-slate-200 dark:border-slate-800"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setView({ tab: t.id })}
                className={`flex-1 px-2 py-2.5 text-sm font-medium transition ${
                  tab === t.id
                    ? 'border-b-2 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
            {tab === 'overview' && <OverviewPanel />}
            {tab === 'textures' && <TexturePanel />}
            {tab === 'uv' && <UvPanel />}
            {tab === 'rig' && <RigPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}
