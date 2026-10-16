import { useEffect, useMemo, useState } from 'react';
import type { Object3D } from 'three';
import {
  ancestorsOf,
  buildSceneTree,
  kindLabel,
  type SceneNode,
  type SceneNodeKind,
} from '../../../logic/sceneTree';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { selectNode } from '../actions';
import { Row } from '../primitives';
import { NodeIcon } from './icons';

/** シーン階層のツリー。filter を渡すと、その種類のノードとその祖先だけを表示する。 */
export function SceneTreeView({
  root,
  filter,
  defaultDepth = 1,
  onOpen,
  testId,
}: {
  root: Object3D;
  filter?: (kind: SceneNodeKind) => boolean;
  defaultDepth?: number;
  onOpen?: (uuid: string) => void;
  testId?: string;
}) {
  const tree = useMemo(() => {
    const full = buildSceneTree(root);
    return filter ? prune(full, filter) : full;
  }, [root, filter]);
  const selection = useWorkbenchStore((s) => s.selection);
  const selectedUuid = selection.kind === 'node' ? selection.uuid : null;
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded(tree, defaultDepth));

  useEffect(() => setExpanded(initialExpanded(tree, defaultDepth)), [tree, defaultDepth]);

  // 3D ビューなどで選んだノードが見えるよう、祖先を開く
  useEffect(() => {
    if (!selectedUuid) return;
    const path = ancestorsOf(tree, selectedUuid);
    if (path && path.some((id) => !expanded.has(id))) setExpanded(new Set([...expanded, ...path]));
  }, [selectedUuid, tree]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (uuid: string) => {
    const next = new Set(expanded);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    setExpanded(next);
  };

  const rows: JSX.Element[] = [];
  const walk = (nodes: SceneNode[]) => {
    for (const n of nodes) {
      const open = expanded.has(n.uuid);
      rows.push(
        <Row
          key={n.uuid}
          depth={n.depth}
          selected={selectedUuid === n.uuid}
          expanded={n.children.length > 0 ? open : undefined}
          onToggle={() => toggle(n.uuid)}
          icon={<NodeIcon kind={n.kind} />}
          label={n.name}
          title={`${n.name}（${kindLabel(n.kind)}）`}
          onClick={() => selectNode(n.uuid)}
          onDoubleClick={() => (onOpen ? onOpen(n.uuid) : n.children.length > 0 && toggle(n.uuid))}
          testId="scene-node"
        />,
      );
      if (open) walk(n.children);
    }
  };
  walk(tree);
  return (
    <div role="tree" data-testid={testId}>
      {rows}
    </div>
  );
}

function prune(nodes: SceneNode[], keep: (kind: SceneNodeKind) => boolean): SceneNode[] {
  return nodes.flatMap((n) => {
    const children = prune(n.children, keep);
    return keep(n.kind) || children.length > 0 ? [{ ...n, children }] : [];
  });
}

function initialExpanded(nodes: SceneNode[], depth: number): Set<string> {
  const set = new Set<string>();
  const walk = (list: SceneNode[]) => {
    for (const n of list) {
      if (n.depth < depth) set.add(n.uuid);
      walk(n.children);
    }
  };
  walk(nodes);
  return set;
}
