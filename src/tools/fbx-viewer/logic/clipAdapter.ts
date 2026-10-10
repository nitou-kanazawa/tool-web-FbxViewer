import { AnimationClip, type KeyframeTrack } from 'three';
import { trackNodeName, trackProperty } from './boneMatching';

export interface AdaptOptions {
  /** アニメ側の名前 → モデル側の名前。null なら名前を変えない（モデル内蔵アニメ） */
  mapping: ReadonlyMap<string, string> | null;
  /** アニメ側の腰のボーン名 */
  animRoot: string | null;
  /** false なら腰の X・Z を最初のフレームに固定する（F-2-08） */
  rootMotion: boolean;
  /** 腰の位置トラックに掛ける倍率（体格や単位の違いの補正） */
  rootScale: number;
}

/**
 * アニメのクリップをモデル用に変換する（設計書 §5.9）。
 * - 名前を mapping で書き換え、対応がないトラックは捨てる
 * - mapping がある（別ファイルのアニメ）ときは、腰以外の位置トラックとスケールトラックを捨てる
 */
export function adaptClip(clip: AnimationClip, opts: AdaptOptions): AnimationClip {
  const tracks: KeyframeTrack[] = [];
  for (const track of clip.tracks) {
    const node = trackNodeName(track.name);
    const prop = trackProperty(track.name);
    const target = opts.mapping ? opts.mapping.get(node) : node;
    if (!target) continue;
    const isRoot = node === opts.animRoot;
    if (opts.mapping && prop === 'scale') continue;
    if (opts.mapping && prop === 'position' && !isRoot) continue;

    const copy = track.clone();
    copy.name = `${target}.${prop}`;
    if (prop === 'position' && isRoot) adjustRootPosition(copy, opts);
    tracks.push(copy);
  }
  return new AnimationClip(clip.name, clip.duration, tracks);
}

function adjustRootPosition(track: KeyframeTrack, opts: AdaptOptions) {
  const values = track.values;
  const x0 = values[0];
  const z0 = values[2];
  for (let i = 0; i < values.length; i += 3) {
    if (!opts.rootMotion) {
      values[i] = x0;
      values[i + 2] = z0;
    }
    values[i] *= opts.rootScale;
    values[i + 1] *= opts.rootScale;
    values[i + 2] *= opts.rootScale;
  }
}

/** 腰の初期位置の長さの比から、位置トラックの倍率を求める。 */
export function computeRootScale(
  modelRootRest: number | null,
  animRootRest: number | null,
): number {
  if (!modelRootRest || !animRootRest || animRootRest < 1e-9) return 1;
  return modelRootRest / animRootRest;
}

/** 30fps として秒をフレーム数に換算する。 */
export function secondsToFrame(seconds: number, fps = 30): number {
  return Math.round(seconds * fps);
}
