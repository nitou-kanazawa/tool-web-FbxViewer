/**
 * サンプル FBX を生成して public/samples/ に書き出す。
 *   npm run samples
 *
 * ここで作るファイルはすべてこのスクリプトから生成した自作データなので、
 * 公開リポジトリに置いても問題ない（Mixamo などの外部素材は使っていない）。
 * ボーン名は Mixamo の命名規則（mixamorig:Hips など）に合わせている。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HIPS_HEIGHT,
  SKELETON,
  buildCharacterMesh,
  paintCharacterTexture,
  paintCrateTexture,
} from './character.ts';
import { FbxSceneBuilder, type CurveInput, type Vec3 } from './fbxScene.ts';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../public/samples');

function addSkeleton(fbx: FbxSceneBuilder, prefix: string, scale: number) {
  const ids = new Map<string, number>();
  for (const b of SKELETON) {
    const id = fbx.addBone({
      name: `${prefix}${b.name}`,
      parent: b.parent ? ids.get(b.parent) : undefined,
      translation: [b.t[0] * scale, b.t[1] * scale, b.t[2] * scale],
    });
    ids.set(b.name, id);
  }
  return ids;
}

// ---- サンプル 1: リグ付きキャラクター（cm 単位・テクスチャ埋め込み・Idle 内蔵） ----

function buildCharacter(): Uint8Array {
  const fbx = new FbxSceneBuilder({ unitScaleFactor: 1 }); // 1 単位 = 1 cm
  const bones = addSkeleton(fbx, 'mixamorig:', 1);
  const mesh = buildCharacterMesh();
  const { modelId, geometryId } = fbx.addMesh({
    name: 'Adventurer',
    positions: mesh.positions,
    polygons: mesh.polygons,
    uvs: mesh.uvs,
    normals: mesh.normals,
  });
  const mat = fbx.addMaterial('AdventurerMaterial', modelId, [1, 1, 1]);
  fbx.addTexture(
    {
      name: 'AdventurerTexture',
      fileName: 'adventurer_basecolor.png',
      embedded: paintCharacterTexture(512),
    },
    mat,
  );

  // 頂点ごとのウェイトから、ボーンごとのクラスタを作る
  const clusters = new Map<string, { indices: number[]; weights: number[] }>();
  mesh.weights.forEach((list, vi) => {
    for (const { bone, w } of list) {
      const c = clusters.get(bone) ?? { indices: [], weights: [] };
      c.indices.push(vi);
      c.weights.push(w);
      clusters.set(bone, c);
    }
  });
  fbx.addSkin(
    geometryId,
    modelId,
    SKELETON.map((b) => ({
      boneId: bones.get(b.name)!,
      ...(clusters.get(b.name) ?? { indices: [], weights: [] }),
    })),
  );

  const t = [0, 1.5, 3];
  const zero = t.map(() => 0);
  fbx.addAnimation('Idle', 3, [
    { modelId: bones.get('Spine')!, attr: 'R', times: t, x: [0, 3, 0], y: zero, z: zero },
    { modelId: bones.get('Head')!, attr: 'R', times: t, x: [0, -3, 0], y: [-6, 6, -6], z: zero },
    {
      modelId: bones.get('LeftArm')!,
      attr: 'R',
      times: t,
      x: zero,
      y: [0, 4, 0],
      z: [-70, -66, -70],
    },
    {
      modelId: bones.get('RightArm')!,
      attr: 'R',
      times: t,
      x: zero,
      y: [0, -4, 0],
      z: [70, 66, 70],
    },
    {
      modelId: bones.get('LeftForeArm')!,
      attr: 'R',
      times: t,
      x: zero,
      y: [-12, -16, -12],
      z: zero,
    },
    { modelId: bones.get('RightForeArm')!, attr: 'R', times: t, x: zero, y: [12, 16, 12], z: zero },
  ]);
  return fbx.build();
}

// ---- サンプル 2/3: アニメーションのみ（m 単位・接頭辞 mixamorig1:） --------------

/** アニメ側のスケルトンはキャラより少し大きい（腰の高さ 1.0 m）。移動量の補正の確認用。 */
const ANIM_SCALE = 0.01 * (100 / HIPS_HEIGHT);
const HIPS_Y = HIPS_HEIGHT * ANIM_SCALE;

function buildAnimation(
  name: string,
  duration: number,
  curves: (ids: Map<string, number>) => CurveInput[],
) {
  const fbx = new FbxSceneBuilder({ unitScaleFactor: 100 }); // 1 単位 = 1 m
  const ids = addSkeleton(fbx, 'mixamorig1:', ANIM_SCALE);
  fbx.addAnimation(name, duration, curves(ids));
  return fbx.build();
}

function buildWave(): Uint8Array {
  const t = [0, 0.5, 1, 1.5, 2];
  const zero = t.map(() => 0);
  return buildAnimation('Wave', 2, (ids) => [
    {
      modelId: ids.get('Hips')!,
      attr: 'T',
      times: t,
      x: zero,
      y: [HIPS_Y, HIPS_Y - 0.02, HIPS_Y, HIPS_Y - 0.02, HIPS_Y],
      z: zero,
    },
    {
      modelId: ids.get('LeftArm')!,
      attr: 'R',
      times: t,
      x: zero,
      y: zero,
      z: [-65, 55, 60, 55, -65],
    },
    {
      modelId: ids.get('LeftForeArm')!,
      attr: 'R',
      times: t,
      x: zero,
      y: zero,
      z: [0, 35, -15, 35, 0],
    },
    {
      modelId: ids.get('RightArm')!,
      attr: 'R',
      times: t,
      x: zero,
      y: zero,
      z: [65, 65, 65, 65, 65],
    },
    {
      modelId: ids.get('Head')!,
      attr: 'R',
      times: t,
      x: zero,
      y: [0, 10, 15, 10, 0],
      z: [0, 5, 5, 5, 0],
    },
  ]);
}

function buildWalk(): Uint8Array {
  const t = [0, 0.25, 0.5, 0.75, 1];
  const zero = t.map(() => 0);
  const bob = [HIPS_Y, HIPS_Y - 0.03, HIPS_Y, HIPS_Y - 0.03, HIPS_Y];
  return buildAnimation('Walk', 1, (ids) => [
    {
      modelId: ids.get('Hips')!,
      attr: 'T',
      times: t,
      x: zero,
      y: bob,
      z: [0, 0.35, 0.7, 1.05, 1.4],
    },
    {
      modelId: ids.get('LeftUpLeg')!,
      attr: 'R',
      times: t,
      x: [-25, 0, 25, 0, -25],
      y: zero,
      z: zero,
    },
    {
      modelId: ids.get('RightUpLeg')!,
      attr: 'R',
      times: t,
      x: [25, 0, -25, 0, 25],
      y: zero,
      z: zero,
    },
    { modelId: ids.get('LeftLeg')!, attr: 'R', times: t, x: [0, 10, 35, 10, 0], y: zero, z: zero },
    {
      modelId: ids.get('RightLeg')!,
      attr: 'R',
      times: t,
      x: [35, 10, 0, 10, 35],
      y: zero,
      z: zero,
    },
    {
      modelId: ids.get('LeftArm')!,
      attr: 'R',
      times: t,
      x: [20, 0, -20, 0, 20],
      y: zero,
      z: [-70, -70, -70, -70, -70],
    },
    {
      modelId: ids.get('RightArm')!,
      attr: 'R',
      times: t,
      x: [-20, 0, 20, 0, -20],
      y: zero,
      z: [70, 70, 70, 70, 70],
    },
  ]);
}

// ---- サンプル 4: 検品で警告が出る木箱（m 単位・外部テクスチャ） --------------------

const FACES = [
  [4, 5, 6, 7], // +Z
  [1, 0, 3, 2], // -Z
  [5, 1, 2, 6], // +X
  [0, 4, 7, 3], // -X
  [7, 6, 2, 3], // +Y
  [0, 1, 5, 4], // -Y
];

function boxCorners(min: Vec3, max: Vec3): Vec3[] {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  return [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
}

/**
 * わざと問題を入れた木箱。原点が中心（足元にない）、ルートに回転が残っている、
 * 全面に同じ UV を貼っている、テクスチャが外部参照（Windows のパス）。
 */
function buildCube(): Uint8Array {
  const fbx = new FbxSceneBuilder({ unitScaleFactor: 100 });
  const { modelId } = fbx.addMesh({
    name: 'Crate',
    positions: boxCorners([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]),
    polygons: FACES,
    uvs: FACES.map(() => [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]),
    // Blender から「トランスフォームを適用」せずに書き出したときの状態を再現
    rotation: [-90, 0, 0],
  });
  const mat = fbx.addMaterial('CrateMaterial', modelId, [1, 1, 1]);
  fbx.addTexture(
    { name: 'CrateTexture', fileName: 'C:\\Users\\artist\\textures\\cube_basecolor.png' },
    mat,
  );
  return fbx.build();
}

// ---- 書き出し ---------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
const outputs: [string, Uint8Array][] = [
  ['sample-character.fbx', buildCharacter()],
  ['anim-wave.fbx', buildWave()],
  ['anim-walk.fbx', buildWalk()],
  ['cube.fbx', buildCube()],
  // 300×300（2 のべき乗ではないので検品で警告が出る）
  ['cube_basecolor.png', paintCrateTexture(300)],
  ['not-fbx.fbx', new TextEncoder().encode('これは FBX ではないテキストファイルです。\n')],
];
for (const [name, data] of outputs) {
  writeFileSync(join(OUT_DIR, name), data);
  console.log(`${name}\t${data.length} bytes`);
}
