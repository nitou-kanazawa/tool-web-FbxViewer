import { normalizeBoneName } from './boneMatching';

/**
 * Unity の Humanoid で必須のボーン（15 本）と、よく使われる名前の候補（正規化済み）。
 * https://docs.unity3d.com/ja/current/Manual/AvatarCreationandSetup.html
 */
export const HUMANOID_REQUIRED: ReadonlyArray<{ id: string; label: string; aliases: string[] }> = [
  { id: 'Hips', label: '腰', aliases: ['hips', 'pelvis', 'hip'] },
  { id: 'Spine', label: '背骨', aliases: ['spine', 'spine1', 'spine01'] },
  { id: 'Head', label: '頭', aliases: ['head'] },
  {
    id: 'LeftUpperLeg',
    label: '左太もも',
    aliases: ['leftupleg', 'leftupperleg', 'thighl', 'lthigh', 'upperlegl'],
  },
  {
    id: 'LeftLowerLeg',
    label: '左すね',
    aliases: ['leftleg', 'leftlowerleg', 'shinl', 'lcalf', 'calfl', 'lowerlegl'],
  },
  { id: 'LeftFoot', label: '左足', aliases: ['leftfoot', 'footl', 'lfoot'] },
  {
    id: 'RightUpperLeg',
    label: '右太もも',
    aliases: ['rightupleg', 'rightupperleg', 'thighr', 'rthigh', 'upperlegr'],
  },
  {
    id: 'RightLowerLeg',
    label: '右すね',
    aliases: ['rightleg', 'rightlowerleg', 'shinr', 'rcalf', 'calfr', 'lowerlegr'],
  },
  { id: 'RightFoot', label: '右足', aliases: ['rightfoot', 'footr', 'rfoot'] },
  {
    id: 'LeftUpperArm',
    label: '左上腕',
    aliases: ['leftarm', 'leftupperarm', 'upperarml', 'lupperarm'],
  },
  {
    id: 'LeftLowerArm',
    label: '左前腕',
    aliases: ['leftforearm', 'leftlowerarm', 'forearml', 'lforearm', 'lowerarml'],
  },
  { id: 'LeftHand', label: '左手', aliases: ['lefthand', 'handl', 'lhand'] },
  {
    id: 'RightUpperArm',
    label: '右上腕',
    aliases: ['rightarm', 'rightupperarm', 'upperarmr', 'rupperarm'],
  },
  {
    id: 'RightLowerArm',
    label: '右前腕',
    aliases: ['rightforearm', 'rightlowerarm', 'forearmr', 'rforearm', 'lowerarmr'],
  },
  { id: 'RightHand', label: '右手', aliases: ['righthand', 'handr', 'rhand'] },
];

export interface HumanoidCheck {
  id: string;
  label: string;
  /** 見つかったボーン名（なければ null） */
  bone: string | null;
}

/** Humanoid の必須ボーンがそろっているかを名前で推定する（F-5-05）。 */
export function checkHumanoid(boneNames: ReadonlyArray<string>): HumanoidCheck[] {
  const byKey = new Map(boneNames.map((n) => [normalizeBoneName(n), n]));
  return HUMANOID_REQUIRED.map((req) => {
    const hit = req.aliases.find((a) => byKey.has(a));
    return { id: req.id, label: req.label, bone: hit ? byKey.get(hit)! : null };
  });
}
