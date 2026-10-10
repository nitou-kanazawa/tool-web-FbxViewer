import { Bone, BufferGeometry, Float32BufferAttribute, Group, Uint16BufferAttribute } from 'three';
import { boneWeightsOf, buildBoneTree, flattenBoneTree, weightToColor } from './boneWeights';
import { computeFitCamera } from './cameraFit';
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
  it('バウンディングボックスの中心を見て、全体が収まる距離に置く', () => {
    const fit = computeFitCamera({ min: [-0.5, 0, -0.5], max: [0.5, 2, 0.5] }, 45, 1);
    expect(fit.target).toEqual([0, 1, 0]);
    const d = Math.hypot(fit.position[0], fit.position[1] - 1, fit.position[2]);
    const radius = Math.hypot(1, 2, 1) / 2;
    expect(d).toBeGreaterThan(radius / Math.sin((22.5 * Math.PI) / 180));
    expect(fit.position[2]).toBeGreaterThan(0); // 正面（+Z）側
  });
  it('縦長の画面では横の画角で決まる', () => {
    const wide = computeFitCamera({ min: [-1, -1, -1], max: [1, 1, 1] }, 45, 2);
    const tall = computeFitCamera({ min: [-1, -1, -1], max: [1, 1, 1] }, 45, 0.5);
    expect(Math.hypot(...tall.position)).toBeGreaterThan(Math.hypot(...wide.position));
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
