import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { filesFromDrop } from '../dropFiles';
import { ActivityBar } from './ActivityBar';
import { addAnimationFiles, openModelFiles } from './actions';
import { CommandPalette } from './CommandPalette';
import { buildCommands } from './commands';
import { EditorArea } from './EditorArea';
import { registerFileInput } from './fileDialogs';
import { Inspector } from './Inspector';
import { Notifications } from './Notifications';
import { Panel } from './Panel';
import { Sash } from './Sash';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { TitleBar } from './TitleBar';
import { useKeybindings } from './useKeybindings';
import { clampSize } from '../../logic/workbenchLayout';

export const MODEL_ACCEPT = '.fbx,.png,.jpg,.jpeg,.tga,.psd,.bmp,.webp';

/** VS Code 風のワークベンチ（設計書 §15）。 */
export function Workbench() {
  const wb = useWorkbenchStore();
  const initLibrary = useViewerStore((s) => s.initLibrary);
  const commands = useMemo(() => buildCommands(), []);
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  useKeybindings(commands);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = await filesFromDrop(e.dataTransfer);
    if (files.length > 0) await openModelFiles(files);
  };

  const sidebarWidth = clampSize('sidebar', wb.sizes.sidebar, viewport.w);
  const inspectorWidth = clampSize('inspector', wb.sizes.inspector, viewport.w);
  const panelHeight = clampSize('panel', wb.sizes.panel, viewport.h);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden text-[13px]"
      data-testid="workbench"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={onDrop}
    >
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        {wb.sidebarVisible && (
          <div className="relative shrink-0" style={{ width: sidebarWidth }}>
            <Sidebar />
            <Sash kind="sidebar" side="right" />
          </div>
        )}
        <main className="flex min-w-0 flex-1 flex-col" aria-label="FBX ファイルのドロップ領域">
          <div className="min-h-0 flex-1">
            <EditorArea />
          </div>
          {wb.panelVisible && (
            <div className="relative shrink-0" style={{ height: panelHeight }}>
              <Sash kind="panel" side="top" />
              <Panel />
            </div>
          )}
        </main>
        {wb.inspectorVisible && (
          <div className="relative shrink-0" style={{ width: inspectorWidth }}>
            <Sash kind="inspector" side="left" />
            <Inspector />
          </div>
        )}
      </div>
      <StatusBar />

      <CommandPalette commands={commands} />
      <Notifications />
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center border-4 border-dashed border-[#007fd4] bg-[#007fd4]/10 text-[16px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          ドロップして FBX を開く（アニメはサイドバーの「アニメーション」かタイムラインへ）
        </div>
      )}

      <input
        ref={(el) => registerFileInput('model', el)}
        type="file"
        multiple
        accept={MODEL_ACCEPT}
        aria-label="FBX ファイルを選択"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void openModelFiles(files);
          e.target.value = '';
        }}
      />
      <input
        ref={(el) => registerFileInput('animation', el)}
        type="file"
        multiple
        accept=".fbx"
        aria-label="アニメ FBX を追加"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void addAnimationFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
