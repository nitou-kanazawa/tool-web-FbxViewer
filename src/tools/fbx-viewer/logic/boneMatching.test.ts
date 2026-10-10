import { isRootBoneName, matchBones, normalizeBoneName } from './boneMatching';

describe('normalizeBoneName', () => {
  it.each([
    ['mixamorigHips', 'hips'],
    ['mixamorig1LeftArm', 'leftarm'],
    ['Left_Arm', 'leftarm'],
    ['Armature_Spine', 'spine'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeBoneName(input)).toBe(expected);
  });
});

describe('matchBones', () => {
  const model = ['mixamorigHips', 'mixamorigSpine', 'mixamorigHead', 'mixamorigLeftArm'];

  it('接頭辞が違っても一致する', () => {
    const r = matchBones(model, [
      'mixamorig1Hips',
      'mixamorig1Spine',
      'mixamorig1Head',
      'mixamorig1LeftArm',
    ]);
    expect(r.verdict).toBe('ok');
    expect(r.mapping.get('mixamorig1Hips')).toBe('mixamorigHips');
    expect(r.modelRoot).toBe('mixamorigHips');
    expect(r.animRoot).toBe('mixamorig1Hips');
  });

  it('一部だけ一致すれば partial', () => {
    const r = matchBones(model, ['Hips', 'Spine', 'Head', 'Tail']);
    expect(r.verdict).toBe('partial');
    expect(r.unmatchedAnim).toEqual(['Tail']);
    expect(r.unmatchedModel).toEqual(['mixamorigLeftArm']);
  });

  it('一致率が 50% 未満なら no-match', () => {
    expect(matchBones(model, ['Hips', 'A', 'B', 'C']).verdict).toBe('no-match');
  });

  it('腰が一致しなければ no-match', () => {
    expect(matchBones(['Spine', 'Head'], ['Hips', 'Spine', 'Head']).verdict).toBe('no-match');
  });

  it('モデルにボーンがなければ no-skeleton', () => {
    expect(matchBones([], ['Hips']).verdict).toBe('no-skeleton');
  });

  it('isRootBoneName', () => {
    expect(isRootBoneName('mixamorigHips')).toBe(true);
    expect(isRootBoneName('Pelvis')).toBe(true);
    expect(isRootBoneName('Spine')).toBe(false);
  });
});
