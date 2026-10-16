import type { Object3D } from 'three';

export type SceneNodeKind = 'skinnedMesh' | 'mesh' | 'bone' | 'light' | 'camera' | 'group';

export interface SceneNode {
  uuid: string;
  name: string;
  kind: SceneNodeKind;
  depth: number;
  children: SceneNode[];
}

/** 表示のために追加した補助オブジェクト（ワイヤーの重ね表示など）の名前の接頭辞。 */
export const HELPER_PREFIX = '__';

export function nodeKind(obj: Object3D): SceneNodeKind {
  const o = obj as Object3D & Record<string, unknown>;
  if (o.isSkinnedMesh) return 'skinnedMesh';
  if (o.isMesh) return 'mesh';
  if (o.isBone) return 'bone';
  if (o.isLight) return 'light';
  if (o.isCamera) return 'camera';
  return 'group';
}

const KIND_LABEL: Record<SceneNodeKind, string> = {
  skinnedMesh: 'スキンメッシュ',
  mesh: 'メッシュ',
  bone: 'ボーン',
  light: 'ライト',
  camera: 'カメラ',
  group: 'グループ',
};

export function kindLabel(kind: SceneNodeKind): string {
  return KIND_LABEL[kind];
}

/** シーン階層をツリーにする（ルート自身は含めず、その子から）。補助オブジェクトは除く。 */
export function buildSceneTree(root: Object3D): SceneNode[] {
  const build = (obj: Object3D, depth: number): SceneNode => ({
    uuid: obj.uuid,
    name: obj.name || `(${KIND_LABEL[nodeKind(obj)]})`,
    kind: nodeKind(obj),
    depth,
    children: visibleChildren(obj).map((c) => build(c, depth + 1)),
  });
  return visibleChildren(root).map((c) => build(c, 0));
}

function visibleChildren(obj: Object3D): Object3D[] {
  return obj.children.filter((c) => !c.name.startsWith(HELPER_PREFIX));
}

/** 指定した uuid までの祖先の uuid（ツリーを展開するのに使う）。見つからなければ null。 */
export function ancestorsOf(nodes: ReadonlyArray<SceneNode>, uuid: string): string[] | null {
  for (const n of nodes) {
    if (n.uuid === uuid) return [];
    const inner = ancestorsOf(n.children, uuid);
    if (inner) return [n.uuid, ...inner];
  }
  return null;
}
