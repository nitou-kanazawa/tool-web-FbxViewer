/**
 * サンプルのキャラクター「冒険者」の形・スキン・テクスチャ（すべて手続き的に生成）。
 * 単位は cm、T ポーズ、正面は +Z。ボーン名は Mixamo の命名規則に合わせる。
 */
import type { Vec3 } from './fbxScene.ts';
import { Painter, hash, hex, mix, shade, type Rgb } from './painter.ts';
import {
  blended,
  capsule,
  ellipsoid,
  inset,
  lathe,
  mergeParts,
  rigid,
  type Part,
  type UvRect,
} from './shapes.ts';

/** スケルトン（親からの相対位置、cm）。 */
export const SKELETON: { name: string; parent?: string; t: Vec3 }[] = [
  { name: 'Hips', t: [0, 92, 0] },
  { name: 'Spine', parent: 'Hips', t: [0, 13, 0] },
  { name: 'Neck', parent: 'Spine', t: [0, 37, 0] },
  { name: 'Head', parent: 'Neck', t: [0, 10, 0] },
  { name: 'LeftUpLeg', parent: 'Hips', t: [9, -2, 0] },
  { name: 'LeftLeg', parent: 'LeftUpLeg', t: [0, -40, 0] },
  { name: 'LeftFoot', parent: 'LeftLeg', t: [0, -41, 0] },
  { name: 'RightUpLeg', parent: 'Hips', t: [-9, -2, 0] },
  { name: 'RightLeg', parent: 'RightUpLeg', t: [0, -40, 0] },
  { name: 'RightFoot', parent: 'RightLeg', t: [0, -41, 0] },
  { name: 'LeftArm', parent: 'Spine', t: [17, 33, 0] },
  { name: 'LeftForeArm', parent: 'LeftArm', t: [26, 0, 0] },
  { name: 'LeftHand', parent: 'LeftForeArm', t: [21, 0, 0] },
  { name: 'RightArm', parent: 'Spine', t: [-17, 33, 0] },
  { name: 'RightForeArm', parent: 'RightArm', t: [-26, 0, 0] },
  { name: 'RightHand', parent: 'RightForeArm', t: [-21, 0, 0] },
];

/** 腰の高さ（cm）。アニメ側の移動量の補正の確認に使う。 */
export const HIPS_HEIGHT = 92;

type Look =
  'skin' | 'face' | 'hair' | 'shirt' | 'sleeve' | 'forearm' | 'pelvis' | 'pants' | 'boot' | 'shoe';

/** UV アトラス上の領域（部品ごとに重ならないように割り当てる）。 */
const UV: Record<string, { rect: UvRect; look: Look }> = {
  head: { rect: [0, 0.5, 0.5, 1], look: 'face' },
  hair: { rect: [0.5, 0.75, 1, 1], look: 'hair' },
  torso: { rect: [0.5, 0.5, 1, 0.75], look: 'shirt' },
  pelvis: { rect: [0, 0.375, 0.25, 0.5], look: 'pelvis' },
  neck: { rect: [0.25, 0.375, 0.375, 0.5], look: 'skin' },
  upperArmL: { rect: [0.375, 0.375, 0.5625, 0.5], look: 'sleeve' },
  upperArmR: { rect: [0.5625, 0.375, 0.75, 0.5], look: 'sleeve' },
  foreArmL: { rect: [0.75, 0.375, 0.875, 0.5], look: 'forearm' },
  foreArmR: { rect: [0.875, 0.375, 1, 0.5], look: 'forearm' },
  thighL: { rect: [0, 0.125, 0.125, 0.375], look: 'pants' },
  thighR: { rect: [0.125, 0.125, 0.25, 0.375], look: 'pants' },
  shinL: { rect: [0.25, 0.125, 0.375, 0.375], look: 'boot' },
  shinR: { rect: [0.375, 0.125, 0.5, 0.375], look: 'boot' },
  footL: { rect: [0.5, 0.125, 0.625, 0.375], look: 'shoe' },
  footR: { rect: [0.625, 0.125, 0.75, 0.375], look: 'shoe' },
  handL: { rect: [0.75, 0.125, 0.875, 0.375], look: 'skin' },
  handR: { rect: [0.875, 0.125, 1, 0.375], look: 'skin' },
};

const uv = (key: string) => inset(UV[key].rect);

/** キャラクターの部品をすべて作り、1 つのメッシュにまとめる。 */
export function buildCharacterMesh() {
  const parts: Part[] = [
    rigid(ellipsoid('pelvis', [0, 96, 0], [14, 9.5, 9.5], uv('pelvis'), 20, 10), 'Hips'),
    blended(
      lathe({
        name: 'torso',
        from: [0, 100, 0],
        to: [0, 146, 0],
        profile: [
          { t: 0, r: 12 },
          { t: 0.12, r: 12.8 },
          { t: 0.32, r: 13.6 },
          { t: 0.55, r: 15 },
          { t: 0.74, r: 15.6 },
          { t: 0.86, r: 14.2 },
          { t: 0.94, r: 10 },
          { t: 1, r: 5.5 },
        ],
        segs: 24,
        squash: 0.64,
        uv: uv('torso'),
      }),
      'Spine',
      [0, 100, 0],
      [0, 146, 0],
      { start: { bone: 'Hips', range: 10 }, end: { bone: 'Neck', range: 5 } },
    ),
    blended(
      capsule('neck', [0, 142, 0], [0, 153, 0], 5, 4.6, uv('neck'), 12),
      'Neck',
      [0, 142, 0],
      [0, 153, 0],
      {
        end: { bone: 'Head', range: 4 },
      },
    ),
    rigid(ellipsoid('head', [0, 161, 1], [11.5, 12.5, 11], uv('head'), 28, 16), 'Head'),
    // 前髪は眉の上、横は耳の高さ、後ろは襟足まで（ボブカット）
    rigid(
      ellipsoid(
        'hair',
        [0, 162, 0.2],
        [12.5, 13.6, 12.3],
        uv('hair'),
        28,
        14,
        (theta) => 0.4 + 0.21 * Math.sin(theta),
      ),
      'Head',
    ),
  ];

  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1;
    const P = side === 'L' ? 'Left' : 'Right';
    const shoulder: Vec3 = [17 * s, 138, 0];
    const elbow: Vec3 = [43 * s, 138, 0];
    const wrist: Vec3 = [64 * s, 138, 0];
    const hip: Vec3 = [9 * s, 90, 0];
    const knee: Vec3 = [9 * s, 50, 0];
    const ankle: Vec3 = [9 * s, 9, 0];
    parts.push(
      blended(
        capsule(`upperArm${side}`, shoulder, [42 * s, 138, 0], 5, 4.4, uv(`upperArm${side}`)),
        `${P}Arm`,
        shoulder,
        elbow,
        {
          start: { bone: 'Spine', range: 6 },
          end: { bone: `${P}ForeArm`, range: 6 },
        },
      ),
      blended(
        capsule(`foreArm${side}`, elbow, [63 * s, 138, 0], 4.2, 3.6, uv(`foreArm${side}`)),
        `${P}ForeArm`,
        elbow,
        wrist,
        {
          start: { bone: `${P}Arm`, range: 6 },
          end: { bone: `${P}Hand`, range: 4 },
        },
      ),
      rigid(
        ellipsoid(`hand${side}`, [68 * s, 138, 0.5], [5.4, 2.7, 3.8], uv(`hand${side}`), 16, 8),
        `${P}Hand`,
      ),
      blended(
        capsule(`thigh${side}`, hip, [9 * s, 51, 0], 7.2, 5.6, uv(`thigh${side}`)),
        `${P}UpLeg`,
        hip,
        knee,
        {
          start: { bone: 'Hips', range: 8 },
          end: { bone: `${P}Leg`, range: 7 },
        },
      ),
      blended(
        capsule(`shin${side}`, knee, [9 * s, 10, 0], 5.4, 4.6, uv(`shin${side}`)),
        `${P}Leg`,
        knee,
        ankle,
        {
          start: { bone: `${P}UpLeg`, range: 7 },
          end: { bone: `${P}Foot`, range: 5 },
        },
      ),
      rigid(
        ellipsoid(`foot${side}`, [9 * s, 4.2, 3.5], [5.6, 4.4, 10.5], uv(`foot${side}`), 16, 8),
        `${P}Foot`,
      ),
    );
  }
  return mergeParts(parts);
}

// ---- テクスチャ -------------------------------------------------------------

const C = {
  skin: hex('#f3c9a8'),
  skinShadow: hex('#d9a083'),
  hair: hex('#5b3524'),
  hairDark: hex('#3e2318'),
  hairLight: hex('#86553a'),
  shirt: hex('#2a9d8f'),
  shirtDark: hex('#1d6f66'),
  cream: hex('#f4ecd8'),
  gold: hex('#e9c46a'),
  pants: hex('#34466e'),
  pantsDark: hex('#26344f'),
  leather: hex('#7a4a2a'),
  leatherDark: hex('#4e2d18'),
  sole: hex('#2b1d14'),
  eye: hex('#3a2a4a'),
  blush: hex('#f08a7e'),
};

/** 布や革の細かなむら（質感を出す）。 */
const grain = (c: Rgb, x: number, y: number, amount = 0.05) =>
  shade(c, 1 + (hash(x, y) - 0.5) * amount);

function paintLook(p: Painter, rect: UvRect, look: Look) {
  switch (look) {
    case 'skin':
    case 'face':
      p.fillRect(rect, (_lu, lv) =>
        mix(C.skinShadow, C.skin, 0.75 + 0.25 * Math.sin(lv * Math.PI)),
      );
      break;
    case 'hair':
      p.fillRect(rect, (lu, lv, x, y) => {
        // 毛束（縦の筋）と、上の方のつや
        const strand = 0.5 + 0.5 * Math.sin(lu * Math.PI * 2 * 18 + Math.sin(lv * 6) * 0.8);
        const base = mix(C.hairDark, C.hair, 0.55 + 0.45 * strand);
        const shine = Math.max(0, 1 - Math.abs(lv - 0.72) / 0.07) * 0.6;
        return grain(mix(base, C.hairLight, shine), x, y, 0.06);
      });
      break;
    case 'shirt':
      p.fillRect(rect, (lu, lv, x, y) => {
        let c = mix(C.shirtDark, C.shirt, 0.6 + 0.4 * Math.min(1, lv * 1.6));
        if (lv > 0.86) c = C.cream; // 襟
        if (Math.abs(lu - 0.25) < 0.004 && lv < 0.86) c = C.shirtDark; // 前の合わせ
        if (lv < 0.06) c = C.shirtDark; // 裾
        return grain(c, x, y);
      });
      // 胸の紋章（金色の円と星）
      p.ellipse(rect, 0.2, 0.62, 0.035, 0.11, C.gold);
      p.ellipse(rect, 0.2, 0.62, 0.024, 0.075, C.shirtDark);
      p.ellipse(rect, 0.2, 0.62, 0.012, 0.04, C.gold);
      break;
    case 'sleeve':
      p.fillRect(rect, (_lu, lv, x, y) =>
        grain(lv > 0.84 ? C.cream : mix(C.shirtDark, C.shirt, 0.85), x, y),
      );
      break;
    case 'forearm':
      p.fillRect(rect, (lu, lv, x, y) => {
        if (lv > 0.62 && lv < 0.9)
          return grain(
            mix(C.leatherDark, C.leather, 0.7 + 0.3 * Math.sin(lu * Math.PI * 2)),
            x,
            y,
            0.1,
          );
        return C.skin;
      });
      break;
    case 'pelvis':
      p.fillRect(rect, (_lu, lv, x, y) => {
        if (lv > 0.55 && lv < 0.72) return grain(C.leather, x, y, 0.12); // ベルト
        return grain(lv > 0.72 ? C.shirtDark : C.pants, x, y);
      });
      p.ellipse(rect, 0.25, 0.635, 0.035, 0.07, C.gold); // バックル
      p.ellipse(rect, 0.25, 0.635, 0.02, 0.04, C.leather);
      break;
    case 'pants':
      p.fillRect(rect, (lu, lv, x, y) => {
        const seam = Math.abs(lu - 0.5) < 0.006 || Math.abs(lu) < 0.006;
        return grain(seam ? C.pantsDark : mix(C.pantsDark, C.pants, 0.8 + 0.2 * lv), x, y, 0.08);
      });
      break;
    case 'boot':
      p.fillRect(rect, (_lu, lv, x, y) => {
        if (lv < 0.5) return grain(mix(C.pantsDark, C.pants, 0.85), x, y, 0.08);
        if (lv < 0.58) return grain(C.leatherDark, x, y, 0.1); // 折り返し
        return grain(mix(C.leatherDark, C.leather, 0.6 + (0.4 * (lv - 0.58)) / 0.42), x, y, 0.1);
      });
      break;
    case 'shoe':
      p.fillRect(rect, (_lu, lv, x, y) =>
        grain(
          lv < 0.3 ? C.sole : mix(C.leatherDark, C.leather, Math.min(1, (lv - 0.3) * 2)),
          x,
          y,
          0.1,
        ),
      );
      break;
  }
}

/** 顔（目・眉・口・ほお）。頭の UV で正面は u=0.25、目の高さは赤道よりやや下。 */
function paintFace(p: Painter, rect: UvRect) {
  for (const dx of [-0.072, 0.072]) {
    const u = 0.25 + dx;
    p.ellipse(rect, u, 0.47, 0.03, 0.06, hex('#ffffff'));
    p.ellipse(rect, u, 0.462, 0.024, 0.052, C.eye);
    p.ellipse(rect, u, 0.452, 0.012, 0.028, hex('#120c18'));
    p.ellipse(rect, u - 0.008, 0.488, 0.007, 0.014, hex('#ffffff'));
    p.line(rect, [u - 0.03, 0.555], [u + 0.03, 0.565 - Math.sign(dx) * 0.006], 0.004, C.hairDark);
    p.ellipse(rect, 0.25 + dx * 1.45, 0.4, 0.028, 0.025, C.blush, 0.35);
  }
  p.line(rect, [0.236, 0.372], [0.25, 0.364], 0.0035, hex('#a8564a'));
  p.line(rect, [0.25, 0.364], [0.264, 0.372], 0.0035, hex('#a8564a'));
}

export function paintCharacterTexture(size = 512): Uint8Array {
  const p = new Painter(size, hex('#808080'));
  for (const { rect, look } of Object.values(UV)) paintLook(p, rect, look);
  paintFace(p, UV.head.rect);
  return p.png();
}

// ---- 木箱（検品で警告が出る例）のテクスチャ ---------------------------------------

export function paintCrateTexture(size = 300): Uint8Array {
  const p = new Painter(size, hex('#a8743f'));
  const wood = hex('#b9824a');
  const dark = hex('#6e4524');
  const all: UvRect = [0, 0, 1, 1];
  p.fillRect(all, (lu, lv, x, y) => {
    // 板（5 枚）と木目
    const plank = Math.floor(lv * 5);
    const inPlank = lv * 5 - plank;
    const tone = 0.88 + 0.12 * hash(plank, 7);
    const grainLine = 0.5 + 0.5 * Math.sin((lu * 40 + Math.sin(lv * 30 + plank) * 1.5) * Math.PI);
    let c = shade(mix(wood, hex('#9a6a3a'), grainLine * 0.35), tone);
    if (inPlank < 0.03 || inPlank > 0.97) c = dark;
    // 外枠
    if (lu < 0.1 || lu > 0.9 || lv < 0.1 || lv > 0.9)
      c = shade(mix(wood, dark, 0.35), 0.92 + 0.08 * grainLine);
    return grain(c, x, y, 0.08);
  });
  // 斜めの補強材
  p.line(all, [0.12, 0.14], [0.88, 0.86], 0.045, shade(wood, 0.82));
  p.line(all, [0.12, 0.14], [0.88, 0.86], 0.004, dark, 0.6);
  // 釘
  for (const [u, v] of [
    [0.05, 0.05],
    [0.95, 0.05],
    [0.05, 0.95],
    [0.95, 0.95],
    [0.5, 0.05],
    [0.5, 0.95],
  ]) {
    p.ellipse(all, u, v, 0.012, 0.012, hex('#3a3a3a'));
    p.ellipse(all, u - 0.003, v + 0.003, 0.005, 0.005, hex('#9a9a9a'));
  }
  return p.png();
}
