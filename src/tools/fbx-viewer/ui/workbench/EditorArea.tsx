import { Box, Grid3x3, Image, X } from 'lucide-react';
import type { EditorKind } from '../../logic/workbenchLayout';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { SceneEditor } from './editors/SceneEditor';
import { TextureEditor } from './editors/TextureEditor';
import { UvEditor } from './editors/UvEditor';
import { withKey } from './platform';
import { vsc } from './styles';

const TAB_ICON: Record<EditorKind, JSX.Element> = {
  scene: <Box size={14} className="text-[#75beff]" />,
  uv: <Grid3x3 size={14} className="text-[#89d185]" />,
  texture: <Image size={14} className="text-[#a074c4]" />,
};

/** エディタのタブと中身。3D ビューは非表示にしても破棄しない。 */
export function EditorArea() {
  const editors = useWorkbenchStore((s) => s.editors);
  const active = useWorkbenchStore((s) => s.activeEditor);
  const activate = useWorkbenchStore((s) => s.activateEditor);
  const close = useWorkbenchStore((s) => s.closeEditor);
  const activeTab = editors.find((t) => t.id === active) ?? editors[0];

  return (
    <div className={`flex h-full min-h-0 flex-col ${vsc.editor}`}>
      <div
        role="tablist"
        aria-label="エディタ"
        className={`flex h-[35px] shrink-0 overflow-x-auto ${vsc.tabBar}`}
      >
        {editors.map((t) => {
          const selected = t.id === activeTab.id;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={selected}
              tabIndex={0}
              title={t.title}
              onClick={() => activate(t.id)}
              onAuxClick={(e) => e.button === 1 && close(t.id)}
              onKeyDown={(e) => e.key === 'Enter' && activate(t.id)}
              className={`group flex h-full min-w-0 max-w-[220px] shrink-0 cursor-pointer items-center gap-1.5 border-r pl-3 pr-1 text-[13px] ${vsc.border} ${
                selected ? vsc.tabActive : vsc.tabInactive
              } ${vsc.focus}`}
              data-testid={`editor-tab-${t.kind}`}
            >
              {TAB_ICON[t.kind]}
              <span className="truncate">{t.title}</span>
              {t.kind !== 'scene' ? (
                <button
                  type="button"
                  aria-label={`${t.title} を閉じる`}
                  title={withKey('閉じる', 'Alt+W')}
                  onClick={(e) => {
                    e.stopPropagation();
                    close(t.id);
                  }}
                  className={`ml-1 flex h-5 w-5 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                    selected ? '' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="w-2" />
              )}
            </div>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 ${activeTab.kind === 'scene' ? '' : 'invisible'}`}
          aria-hidden={activeTab.kind !== 'scene'}
        >
          <SceneEditor />
        </div>
        {activeTab.kind === 'uv' && activeTab.target && (
          <div className="absolute inset-0">
            <UvEditor meshUuid={activeTab.target} />
          </div>
        )}
        {activeTab.kind === 'texture' && activeTab.target && (
          <div className="absolute inset-0">
            <TextureEditor textureUuid={activeTab.target} />
          </div>
        )}
      </div>
    </div>
  );
}
