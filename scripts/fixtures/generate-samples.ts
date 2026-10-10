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
import { FbxSceneBuilder, type CurveInput, type Vec3 } from './fbxScene.ts';
import { encodePng } from './pngWriter.ts';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../public/samples');

// ---- 共通: 箱型メッシュ ----------------------------------------------------

interface Box {
  min: Vec3;
  max: Vec3;
  bone: string;
}

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

/** 箱ごとに UV アトラス（4×4 のタイル）の 1 マスを割り当てる。 */
function boxesToMesh(boxes: Box[]) {
  const positions: Vec3[] = [];
  const polygons: number[][] = [];
  const uvs: [number, number][][] = [];
  const tile = 0.25;
  const margin = 0.01;
  boxes.forEach((b, bi) => {
    const base = positions.length;
    positions.push(...boxCorners(b.min, b.max));
    const tu = (bi % 4) * tile;
    const tv = Math.floor(bi / 4) * tile;
    FACES.forEach((f, fi) => {
      polygons.push(f.map((i) => base + i));
      const cw = tile / 3;
      const ch = tile / 2;
      const u0 = tu + (fi % 3) * cw + margin;
      const v0 = tv + Math.floor(fi / 3) * ch + margin;
      const u1 = u0 + cw - margin * 2;
      const v1 = v0 + ch - margin * 2;
      uvs.push([
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ]);
    });
  });
  return { positions, polygons, uvs };
}

function mirrorBox(b: Box, bone: string): Box {
  return { min: [-b.max[0], b.min[1], b.min[2]], max: [-b.min[0], b.max[1], b.max[2]], bone };
}

// ---- 共通: スケルトン（Mixamo 風の命名・cm 単位の T ポーズ） ------------------

const SKELETON: { name: string; parent?: string; t: Vec3 }[] = [
  { name: 'Hips', t: [0, 95, 0] },
  { name: 'Spine', parent: 'Hips', t: [0, 15, 0] },
  { name: 'Neck', parent: 'Spine', t: [0, 38, 0] },
  { name: 'Head', parent: 'Neck', t: [0, 8, 0] },
  { name: 'LeftUpLeg', parent: 'Hips', t: [10, -5, 0] },
  { name: 'LeftLeg', parent: 'LeftUpLeg', t: [0, -42, 0] },
  { name: 'LeftFoot', parent: 'LeftLeg', t: [0, -42, 0] },
  { name: 'RightUpLeg', parent: 'Hips', t: [-10, -5, 0] },
  { name: 'RightLeg', parent: 'RightUpLeg', t: [0, -42, 0] },
  { name: 'RightFoot', parent: 'RightLeg', t: [0, -42, 0] },
  { name: 'LeftArm', parent: 'Spine', t: [20, 35, 0] },
  { name: 'LeftForeArm', parent: 'LeftArm', t: [26, 0, 0] },
  { name: 'LeftHand', parent: 'LeftForeArm', t: [24, 0, 0] },
  { name: 'RightArm', parent: 'Spine', t: [-20, 35, 0] },
  { name: 'RightForeArm', parent: 'RightArm', t: [-26, 0, 0] },
  { name: 'RightHand', parent: 'RightForeArm', t: [-24, 0, 0] },
];

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

function atlasTexture(size: number): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = Math.floor((x / size) * 4);
      const ty = Math.floor((y / size) * 4);
      const hue = ((ty * 4 + tx) * 360) / 16;
      const [r, g, b] = hslToRgb(hue, 0.55, 0.6);
      const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 1 : 0.82;
      const edge = x % (size / 4) < 2 || y % (size / 4) < 2 ? 0.4 : 1;
      const i = (y * size + x) * 4;
      px[i] = r * checker * edge;
      px[i + 1] = g * checker * edge;
      px[i + 2] = b * checker * edge;
      px[i + 3] = 255;
    }
  }
  return encodePng(size, size, px);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function buildCharacter(): Uint8Array {
  const fbx = new FbxSceneBuilder({ unitScaleFactor: 1 }); // 1 単位 = 1 cm
  const prefix = 'mixamorig:';
  const bones = addSkeleton(fbx, prefix, 1);

  const left: Box[] = [
    { min: [4, 48, -7], max: [16, 85, 7], bone: 'LeftUpLeg' },
    { min: [5, 6, -6], max: [15, 48, 6], bone: 'LeftLeg' },
    { min: [4, 0, -6], max: [16, 6, 14], bone: 'LeftFoot' },
    { min: [18, 140, -5], max: [46, 150, 5], bone: 'LeftArm' },
    { min: [46, 141, -4], max: [70, 149, 4], bone: 'LeftForeArm' },
    { min: [70, 141, -3], max: [80, 149, 3], bone: 'LeftHand' },
  ];
  const boxes: Box[] = [
    { min: [-16, 85, -9], max: [16, 105, 9], bone: 'Hips' },
    { min: [-18, 105, -10], max: [18, 148, 10], bone: 'Spine' },
    { min: [-10, 150, -10], max: [10, 178, 10], bone: 'Head' },
    ...left,
    ...left.map((b) => mirrorBox(b, b.bone.replace('Left', 'Right'))),
  ];
  const mesh = boxesToMesh(boxes);
  const { modelId, geometryId } = fbx.addMesh({ name: 'Body', ...mesh });
  const mat = fbx.addMaterial('BodyMaterial', modelId);
  fbx.addTexture(
    { name: 'BodyTexture', fileName: 'body_basecolor.png', embedded: atlasTexture(256) },
    mat,
  );

  fbx.addSkin(
    geometryId,
    modelId,
    SKELETON.map((b) => {
      const indices: number[] = [];
      boxes.forEach((box, bi) => {
        if (box.bone === b.name) for (let k = 0; k < 8; k++) indices.push(bi * 8 + k);
      });
      return { boneId: bones.get(b.name)!, indices, weights: indices.map(() => 1) };
    }),
  );

  const t = [0, 1, 2];
  fbx.addAnimation('Idle', 2, [
    { modelId: bones.get('Spine')!, attr: 'R', times: t, x: [0, 4, 0], y: [0, 0, 0], z: [0, 0, 0] },
    {
      modelId: bones.get('Head')!,
      attr: 'R',
      times: t,
      x: [0, -3, 0],
      y: [-8, 8, -8],
      z: [0, 0, 0],
    },
    {
      modelId: bones.get('LeftArm')!,
      attr: 'R',
      times: t,
      x: [0, 0, 0],
      y: [0, 0, 0],
      z: [-65, -60, -65],
    },
    {
      modelId: bones.get('RightArm')!,
      attr: 'R',
      times: t,
      x: [0, 0, 0],
      y: [0, 0, 0],
      z: [65, 60, 65],
    },
  ]);
  return fbx.build();
}

// ---- サンプル 2/3: アニメーションのみ（m 単位・接頭辞 mixamorig1:） --------------

/** アニメ側のスケルトンはキャラより少し大きい（腰の高さ 1.0 m）。移動量の補正の確認用。 */
const ANIM_SCALE = 0.01 * (100 / 95);
const HIPS_Y = 95 * ANIM_SCALE;

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

// ---- サンプル 4: 検品で警告が出るキューブ（m 単位・外部テクスチャ） ----------------

function buildCube(): Uint8Array {
  const fbx = new FbxSceneBuilder({ unitScaleFactor: 100 });
  const corners = boxCorners([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]);
  const { modelId } = fbx.addMesh({
    name: 'Cube',
    positions: corners,
    polygons: FACES,
    // 全面に同じ UV を貼る（UV の重なり検出の確認用）
    uvs: FACES.map(() => [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]),
    // Blender から「トランスフォームを適用」せずに書き出したときの状態を再現
    rotation: [-90, 0, 0],
  });
  const mat = fbx.addMaterial('CubeMaterial', modelId);
  fbx.addTexture(
    { name: 'CubeTexture', fileName: 'C:\\Users\\artist\\textures\\cube_basecolor.png' },
    mat,
  );
  return fbx.build();
}

function cubeTexture(): Uint8Array {
  const size = 300; // 2 のべき乗ではない（検品で警告が出る）
  const px = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = (Math.floor(x / 30) + Math.floor(y / 30)) % 2 === 0;
      px[i] = c ? 240 : 70;
      px[i + 1] = c ? 180 : 90;
      px[i + 2] = c ? 60 : 160;
      px[i + 3] = 255;
    }
  }
  return encodePng(size, size, px);
}

// ---- 書き出し ---------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
const outputs: [string, Uint8Array][] = [
  ['sample-character.fbx', buildCharacter()],
  ['anim-wave.fbx', buildWave()],
  ['anim-walk.fbx', buildWalk()],
  ['cube.fbx', buildCube()],
  ['cube_basecolor.png', cubeTexture()],
  ['not-fbx.fbx', new TextEncoder().encode('これは FBX ではないテキストファイルです。\n')],
];
for (const [name, data] of outputs) {
  writeFileSync(join(OUT_DIR, name), data);
  console.log(`${name}\t${data.length} bytes`);
}
