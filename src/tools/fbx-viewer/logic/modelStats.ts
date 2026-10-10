import {
  Box3,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferAttribute,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
  type Texture,
} from 'three';
import { fileUnitsToMeters } from './units';

export type Vec3 = [number, number, number];

/** メッシュ 1 つ分の事実（統計と検品で使う）。 */
export interface MeshFacts {
  name: string;
  vertexCount: number;
  triangleCount: number;
  materialNames: string[];
  isSkinned: boolean;
  hasUv0: boolean;
  hasUv1: boolean;
  hasNormal: boolean;
  /** 0〜1 の範囲外にある UV 座標の数（UV0） */
  uvOutOfRangeCount: number;
  /** ウェイトの合計が 0 の頂点の数（スキンメッシュのみ） */
  zeroWeightVertexCount: number;
  morphTargetCount: number;
}

export interface NodeTransform {
  name: string;
  /** 回転（度） */
  rotationDeg: Vec3;
  scale: Vec3;
}

export interface ModelStats {
  meshes: MeshFacts[];
  totals: {
    meshCount: number;
    vertexCount: number;
    triangleCount: number;
    materialCount: number;
    textureCount: number;
    boneCount: number;
    clipCount: number;
    morphTargetCount: number;
  };
  /** メートル単位のバウンディングボックス（モデルの原点が 0） */
  bounds: { size: Vec3; min: Vec3; max: Vec3 } | null;
  unitScaleFactor: number;
  upAxis: 'Y' | 'Z';
  topLevelTransforms: NodeTransform[];
}

export interface StatsOptions {
  unitScaleFactor: number;
  zUpCorrected: boolean;
}

const UV_EPSILON = 1e-4;

export function computeModelStats(root: Object3D, opts: StatsOptions): ModelStats {
  const meshes: MeshFacts[] = [];
  const materials = new Set<string>();
  const textures = new Set<string>();
  let boneCount = 0;

  root.traverse((obj) => {
    if ((obj as { isBone?: boolean }).isBone) boneCount++;
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = materialsOf(mesh);
    for (const m of mats) {
      materials.add(m.uuid);
      for (const t of texturesOf(m)) textures.add(t.uuid);
    }
    meshes.push(meshFacts(mesh, mats));
  });

  const totals = {
    meshCount: meshes.length,
    vertexCount: sum(meshes.map((m) => m.vertexCount)),
    triangleCount: sum(meshes.map((m) => m.triangleCount)),
    materialCount: materials.size,
    textureCount: textures.size,
    boneCount,
    clipCount: root.animations.length,
    morphTargetCount: sum(meshes.map((m) => m.morphTargetCount)),
  };

  return {
    meshes,
    totals,
    bounds: computeBounds(root, fileUnitsToMeters(opts.unitScaleFactor)),
    unitScaleFactor: opts.unitScaleFactor,
    upAxis: opts.zUpCorrected ? 'Z' : 'Y',
    topLevelTransforms: topLevelTransforms(root, opts.zUpCorrected),
  };
}

export function materialsOf(mesh: Mesh): Material[] {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
}

export function texturesOf(material: Material): Texture[] {
  const result: Texture[] = [];
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && (value as Texture).isTexture) {
      result.push(value as Texture);
    }
  }
  return result;
}

export function triangleCount(geometry: BufferGeometry): number {
  if (geometry.index) return Math.floor(geometry.index.count / 3);
  const pos = geometry.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function meshFacts(mesh: Mesh, mats: Material[]): MeshFacts {
  const g = mesh.geometry;
  const uv = g.getAttribute('uv') as BufferAttribute | undefined;
  const skinned = (mesh as SkinnedMesh).isSkinnedMesh === true;
  return {
    name: mesh.name || '(名前なし)',
    vertexCount: g.getAttribute('position')?.count ?? 0,
    triangleCount: triangleCount(g),
    materialNames: mats.map((m) => m.name || '(名前なし)'),
    isSkinned: skinned,
    hasUv0: !!uv,
    hasUv1: !!g.getAttribute('uv1'),
    hasNormal: !!g.getAttribute('normal'),
    uvOutOfRangeCount: uv ? countOutOfRange(uv) : 0,
    zeroWeightVertexCount: skinned ? countZeroWeights(g) : 0,
    morphTargetCount: g.morphAttributes.position?.length ?? 0,
  };
}

function countOutOfRange(uv: BufferAttribute): number {
  let n = 0;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (u < -UV_EPSILON || u > 1 + UV_EPSILON || v < -UV_EPSILON || v > 1 + UV_EPSILON) n++;
  }
  return n;
}

function countZeroWeights(g: BufferGeometry): number {
  const w = g.getAttribute('skinWeight');
  if (!w) return g.getAttribute('position')?.count ?? 0;
  let n = 0;
  for (let i = 0; i < w.count; i++) {
    if (w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) <= 1e-6) n++;
  }
  return n;
}

/** モデルの原点を基準にしたバウンディングボックス（メートル）。 */
function computeBounds(root: Object3D, metersPerUnit: number) {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return null;
  // 親（表示用のラッパーなど）の変換は取り除き、root の親の座標系で測る
  if (root.parent) box.applyMatrix4(new Matrix4().copy(root.parent.matrixWorld).invert());
  const scale = (v: Vector3): Vec3 => [
    v.x * metersPerUnit,
    v.y * metersPerUnit,
    v.z * metersPerUnit,
  ];
  const size = box.getSize(new Vector3());
  return { size: scale(size), min: scale(box.min), max: scale(box.max) };
}

/** 最上位ノードの回転とスケール（C-05）。ローダーの Z-up 補正による回転は除外する。 */
function topLevelTransforms(root: Object3D, zUpCorrected: boolean): NodeTransform[] {
  const nodes: { obj: Object3D; ignoreRotation: boolean }[] = [
    { obj: root, ignoreRotation: zUpCorrected },
    ...root.children.map((obj) => ({ obj, ignoreRotation: false })),
  ];
  return nodes
    .filter(({ obj }) => !(obj as { isLight?: boolean }).isLight)
    .map(({ obj, ignoreRotation }) => {
      const e = new Euler().setFromQuaternion(ignoreRotation ? new Quaternion() : obj.quaternion);
      const deg = (r: number) => (r * 180) / Math.PI;
      return {
        name: obj === root ? `${obj.name || 'ルート'}` : obj.name || '(名前なし)',
        rotationDeg: [deg(e.x), deg(e.y), deg(e.z)],
        scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      };
    });
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
