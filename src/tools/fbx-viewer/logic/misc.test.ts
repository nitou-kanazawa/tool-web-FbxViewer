import { Bone, BufferGeometry, Float32BufferAttribute, Group, Uint16BufferAttribute } from 'three';
import { boneWeightsOf, buildBoneTree, flattenBoneTree, weightToColor } from './boneWeights';
import { computeFitCamera, viewSpace } from './cameraFit';
import { checkHumanoid } from './humanoid';
import { describeUnit, fileUnitsToMeters } from './units';

describe('units', () => {
  it('UnitScaleFactor をメートルに換算する', () => {
    expect(fileUnitsToMeters(1)).toBe(0.01);
    expect(fileUnitsToMeters(100)).toBe(1);
    expect(fileUnitsToMeters(NaN)).toBe(0.01);
    expect(describeUnit(1)).toBe('cm');
    expect(describeUnit(100)).toBe('m');
  });
});

describe('computeFitCamera', () => {
  const corners = (min: number[], max: number[]) =>
    [min[0], max[0]].flatMap((x) =>
      [min[1], max[1]].flatMap((y) =>
        [min[2], max[2]].map((z) => [x, y, z] as [number, number, number]),
      ),
    );

  /** すべての角が画角（縦 fov・横 fov×aspect）に入っているか。 */
  const allVisible = (
    fit: ReturnType<typeof computeFitCamera>,
    pts: [number, number, number][],
    fov: number,
    aspect: number,
  ) => {
    const tanV = Math.tan((fov * Math.PI) / 360);
    return pts.every((p) => {
      const [x, y, depth] = viewSpace(fit, p);
      return (
        depth > 0 &&
        Math.abs(y) <= depth * tanV + 1e-9 &&
        Math.abs(x) <= depth * tanV * aspect + 1e-9
      );
    });
  };

  it('バウンディングボックスの中心を見て、全体が収まる距離に置く', () => {
    const box = {
      min: [-0.8, 0, -0.15] as [number, number, number],
      max: [0.8, 1.8, 0.15] as [number, number, number],
    };
    const fit = computeFitCamera(box, 45, 1.5);
    expect(fit.target).toEqual([0, 0.9, 0]);
    expect(fit.position[2]).toBeGreaterThan(0); // 正面（+Z）側
    expect(allVisible(fit, corners(box.min, box.max), 45, 1.5)).toBe(true);
    // 余白を除けば、ぎりぎりまで寄っている（外接球で測るより近い）
    const sphere = Math.hypot(1.6, 1.8, 0.3) / 2 / Math.sin((22.5 * Math.PI) / 180);
    expect(Math.hypot(fit.position[0], fit.position[1] - 0.9, fit.position[2])).toBeLessThan(
      sphere,
    );
  });

  it('縦長の画面では横の画角で決まる', () => {
    const box = {
      min: [-1, -1, -1] as [number, number, number],
      max: [1, 1, 1] as [number, number, number],
    };
    const wide = computeFitCamera(box, 45, 2);
    const tall = computeFitCamera(box, 45, 0.5);
    expect(Math.hypot(...tall.position)).toBeGreaterThan(Math.hypot(...wide.position));
    expect(allVisible(tall, corners(box.min, box.max), 45, 0.5)).toBe(true);
  });
});

describe('boneWeights', () => {
  it('指定したボーンのウェイトを頂点ごとに取り出す', () => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    g.setAttribute('skinIndex', new Uint16BufferAttribute([0, 1, 0, 0, 2, 1, 0, 0], 4));
    g.setAttribute('skinWeight', new Float32BufferAttribute([0.7, 0.3, 0, 0, 0.6, 0.4, 0, 0], 4));
    expect(Array.from(boneWeightsOf(g, 1))).toEqual([expect.closeTo(0.3), expect.closeTo(0.4)]);
  });
  it('色の両端', () => {
    expect(weightToColor(1)).toEqual([1, 0, 0]);
    expect(weightToColor(0.5)).toEqual([0, 1, 0]);
  });
  it('ボーンの階層をツリーにする', () => {
    const root = new Group();
    const hips = new Bone();
    hips.name = 'Hips';
    const spine = new Bone();
    spine.name = 'Spine';
    hips.add(spine);
    root.add(hips);
    const tree = buildBoneTree(root);
    expect(tree).toHaveLength(1);
    expect(flattenBoneTree(tree).map((n) => [n.name, n.depth])).toEqual([
      ['Hips', 0],
      ['Spine', 1],
    ]);
  });
});

describe('checkHumanoid', () => {
  it('Mixamo の命名で必須ボーンを見つける', () => {
    const names = [
      'Hips',
      'Spine',
      'Head',
      'LeftUpLeg',
      'LeftLeg',
      'LeftFoot',
      'RightUpLeg',
      'RightLeg',
      'RightFoot',
      'LeftArm',
      'LeftForeArm',
      'LeftHand',
      'RightArm',
      'RightForeArm',
      'RightHand',
    ].map((n) => `mixamorig${n}`);
    expect(checkHumanoid(names).every((c) => c.bone !== null)).toBe(true);
    expect(checkHumanoid(['Hips']).filter((c) => c.bone === null)).toHaveLength(14);
  });
});

describe('lighting', () => {
  it('ライトの向きと仰角から位置を求める', async () => {
    const { keyLightPosition } = await import('./lighting');
    const front = keyLightPosition(0, 0, 10);
    expect(front[0]).toBeCloseTo(0);
    expect(front[2]).toBeCloseTo(10);
    const right = keyLightPosition(90, 0, 10);
    expect(right[0]).toBeCloseTo(10);
    const top = keyLightPosition(0, 90, 10);
    expect(top[1]).toBeCloseTo(10);
  });

  it('プリセットの判定', async () => {
    const { isLightingPreset, LIGHTING_ORDER, LIGHTING } = await import('./lighting');
    expect(LIGHTING_ORDER.every(isLightingPreset)).toBe(true);
    expect(isLightingPreset('disco')).toBe(false);
    expect(Object.keys(LIGHTING)).toHaveLength(LIGHTING_ORDER.length);
  });
});
