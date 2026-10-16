import { useCallback, useMemo } from 'react';
import type { Mesh } from 'three';
import { formatNumber } from '../../../logic/format';
import { triangleCount } from '../../../logic/modelStats';
import type { SceneNodeKind } from '../../../logic/sceneTree';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { findObject, openUvEditor, selectNode } from '../actions';
import { Empty, Row, Section, SeverityIcon, VsCheckbox } from '../primitives';
import { NodeIcon } from './icons';

export function UvView() {
  const model = useViewerStore((s) => s.model);
  const shading = useViewerStore((s) => s.shading);
  const setView = useViewerStore((s) => s.setView);
  const selection = useWorkbenchStore((s) => s.selection);
  const meshes = useMemo(() => {
    const list: Mesh[] = [];
    model?.root.traverse((o) => {
      if ((o as Mesh).isMesh && !o.name.startsWith('__')) list.push(o as Mesh);
    });
    return list;
  }, [model]);
  const open = useCallback((uuid: string) => {
    const mesh = findObject(uuid) as Mesh | undefined;
    if (mesh) openUvEditor(mesh);
  }, []);

  if (!model) return <Empty>FBX を開くと、メッシュごとの UV を確認できます。</Empty>;

  return (
    <>
      <Section title="表示">
        <div className="px-3 py-1">
          <VsCheckbox
            label="3D をチェッカー表示（UV の歪みの確認）"
            checked={shading === 'checker'}
            onChange={(v) => setView({ shading: v ? 'checker' : 'standard' })}
          />
        </div>
      </Section>
      <Section title={`メッシュ (${meshes.length})`}>
        <div role="tree" data-testid="uv-mesh-list">
          {meshes.map((m) => {
            const hasUv = !!m.geometry.getAttribute('uv');
            return (
              <Row
                key={m.uuid}
                icon={
                  hasUv ? (
                    <NodeIcon
                      kind={
                        (m as { isSkinnedMesh?: boolean }).isSkinnedMesh
                          ? 'skinnedMesh'
                          : ('mesh' as SceneNodeKind)
                      }
                    />
                  ) : (
                    <SeverityIcon level="ng" />
                  )
                }
                label={m.name || '(名前なし)'}
                description={
                  hasUv
                    ? `${formatNumber(triangleCount(m.geometry))} 三角形${m.geometry.getAttribute('uv1') ? ' · UV1' : ''}`
                    : 'UV なし'
                }
                title="ダブルクリックで UV エディタを開く"
                selected={selection.kind === 'node' && selection.uuid === m.uuid}
                onClick={() => selectNode(m.uuid)}
                onDoubleClick={() => hasUv && open(m.uuid)}
                trailing={
                  hasUv && (
                    <button
                      type="button"
                      className="rounded px-1 text-[11px] opacity-0 hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        open(m.uuid);
                      }}
                    >
                      開く
                    </button>
                  )
                }
                testId="uv-mesh-item"
              />
            );
          })}
        </div>
      </Section>
    </>
  );
}
