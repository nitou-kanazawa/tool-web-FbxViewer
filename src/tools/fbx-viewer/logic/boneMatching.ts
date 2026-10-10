/**
 * アニメ側とモデル側のボーン名の照合（設計書 §5.9）。
 *
 * FBXLoader はノード名から [ ] . : / を削除するため、Mixamo の "mixamorig:Hips" は
 * three.js の中では "mixamorigHips" になる。既知の接頭辞を取り除いてから比べる。
 */

/** 取り除く接頭辞。Tripo などのリグの命名が分かったら追加する。 */
export const KNOWN_PREFIXES: ReadonlyArray<RegExp> = [/^mixamorig\d*/i, /^armature_?/i];

/** ルート（腰）として扱う正規化済みの名前。 */
const ROOT_NAMES = ['hips', 'pelvis', 'hip'];

export function normalizeBoneName(name: string): string {
  let n = name;
  for (const p of KNOWN_PREFIXES) n = n.replace(p, '');
  return n.toLowerCase().replace(/[_\-\s.]/g, '');
}

export function isRootBoneName(name: string): boolean {
  return ROOT_NAMES.includes(normalizeBoneName(name));
}

export type MatchVerdict = 'ok' | 'partial' | 'no-skeleton' | 'no-match';

export interface MatchReport {
  /** アニメ側の名前 → モデル側の名前 */
  mapping: Map<string, string>;
  matchedCount: number;
  animBoneCount: number;
  unmatchedAnim: string[];
  unmatchedModel: string[];
  /** モデル側の腰のボーン名（見つからなければ null） */
  modelRoot: string | null;
  /** アニメ側の腰のボーン名（見つからなければ null） */
  animRoot: string | null;
  verdict: MatchVerdict;
}

/** これを下回ると「一致しない」と判定する一致率。 */
export const MIN_MATCH_RATIO = 0.5;

export function matchBones(
  modelBones: ReadonlyArray<string>,
  animTargets: ReadonlyArray<string>,
): MatchReport {
  const modelByKey = new Map<string, string>();
  for (const name of modelBones) {
    const key = normalizeBoneName(name);
    if (!modelByKey.has(key)) modelByKey.set(key, name);
  }
  const mapping = new Map<string, string>();
  const unmatchedAnim: string[] = [];
  for (const name of animTargets) {
    const target = modelByKey.get(normalizeBoneName(name));
    if (target) mapping.set(name, target);
    else unmatchedAnim.push(name);
  }
  const used = new Set(mapping.values());
  const unmatchedModel = modelBones.filter((n) => !used.has(n));
  const modelRoot = modelBones.find(isRootBoneName) ?? null;
  const animRoot = animTargets.find(isRootBoneName) ?? null;
  const report = {
    mapping,
    matchedCount: mapping.size,
    animBoneCount: animTargets.length,
    unmatchedAnim,
    unmatchedModel,
    modelRoot,
    animRoot,
  };
  return { ...report, verdict: judge(report, modelBones.length) };
}

function judge(r: Omit<MatchReport, 'verdict'>, modelBoneCount: number): MatchVerdict {
  if (modelBoneCount === 0) return 'no-skeleton';
  if (r.animBoneCount === 0) return 'no-match';
  const ratio = r.matchedCount / r.animBoneCount;
  const rootMissing = r.animRoot !== null && !r.mapping.has(r.animRoot);
  if (ratio < MIN_MATCH_RATIO || rootMissing) return 'no-match';
  if (r.matchedCount < r.animBoneCount) return 'partial';
  return 'ok';
}

/** "Bone.quaternion" → "Bone"。トラック名からノード名を取り出す。 */
export function trackNodeName(trackName: string): string {
  const dot = trackName.indexOf('.');
  return dot >= 0 ? trackName.slice(0, dot) : trackName;
}

export function trackProperty(trackName: string): string {
  const dot = trackName.indexOf('.');
  return dot >= 0 ? trackName.slice(dot + 1) : '';
}
