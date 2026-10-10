import type { BufferGeometry, Object3D } from 'three';

/** ウェイト（0〜1）を色にする。0 は濃い青、0.5 は緑、1 は赤。 */
export function weightToColor(w: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, w));
  if (t <= 0) return [0.05, 0.05, 0.25];
  if (t < 0.5) {
    const k = t / 0.5;
    return [0, k, 1 - k];
  }
  const k = (t - 0.5) / 0.5;
  return [k, 1 - k, 0];
}

/** 頂点ごとに、指定したボーンのウェイトを返す。 */
export function boneWeightsOf(geometry: BufferGeometry, boneIndex: number): Float32Array {
  const indices = geometry.getAttribute('skinIndex');
  const weights = geometry.getAttribute('skinWeight');
  const count = geometry.getAttribute('position')?.count ?? 0;
  const result = new Float32Array(count);
  if (!indices || !weights) return result;
  for (let i = 0; i < count; i++) {
    let w = 0;
    if (indices.getX(i) === boneIndex) w += weights.getX(i);
    if (indices.getY(i) === boneIndex) w += weights.getY(i);
    if (indices.getZ(i) === boneIndex) w += weights.getZ(i);
    if (indices.getW(i) === boneIndex) w += weights.getW(i);
    result[i] = w;
  }
  return result;
}

/** ウェイトから頂点カラー（RGB）の配列を作る。 */
export function weightsToColors(weights: Float32Array): Float32Array {
  const colors = new Float32Array(weights.length * 3);
  for (let i = 0; i < weights.length; i++) colors.set(weightToColor(weights[i]), i * 3);
  return colors;
}

export interface BoneTreeNode {
  name: string;
  uuid: string;
  depth: number;
  children: BoneTreeNode[];
}

const isBone = (o: Object3D | null): boolean => !!o && (o as { isBone?: boolean }).isBone === true;

/** ボーンの階層をツリーにする。親がボーンでないボーンを根とする。 */
export function buildBoneTree(root: Object3D): BoneTreeNode[] {
  const roots: BoneTreeNode[] = [];
  const build = (obj: Object3D, depth: number): BoneTreeNode => ({
    name: obj.name || '(名前なし)',
    uuid: obj.uuid,
    depth,
    children: obj.children.filter(isBone).map((c) => build(c, depth + 1)),
  });
  root.traverse((obj) => {
    if (isBone(obj) && !isBone(obj.parent)) roots.push(build(obj, 0));
  });
  return roots;
}

/** ツリーを上から順に平らにする（表示用）。 */
export function flattenBoneTree(nodes: BoneTreeNode[]): BoneTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenBoneTree(n.children)]);
}
