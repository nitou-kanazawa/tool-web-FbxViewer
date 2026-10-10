import type { AnimationClip, Object3D } from 'three';
import { FbxViewerError } from '../errors';
import { loadFbxModel, type FileLike, type LoadedModel } from '../infra/FbxModelLoader';
import type { AnimationRepository, StoredAnimation } from '../infra/AnimationRepository';
import { isRootBoneName, matchBones, trackNodeName, type MatchReport } from '../logic/boneMatching';
import { adaptClip, computeRootScale } from '../logic/clipAdapter';

export interface AnimationAsset {
  id: string;
  name: string;
  origin: 'embedded' | 'library';
  clips: AnimationClip[];
  boneNames: string[];
  rootName: string | null;
  /** 腰の初期位置（親の座標系での長さ、ファイルの単位） */
  rootRest: number | null;
}

/** モデル側のリグの情報。 */
export interface RigInfo {
  boneNames: string[];
  rootName: string | null;
  rootRest: number | null;
}

export function rigInfoOf(root: Object3D): RigInfo {
  const bones: Object3D[] = [];
  root.traverse((o) => {
    if ((o as { isBone?: boolean }).isBone) bones.push(o);
  });
  const rootBone =
    bones.find((b) => isRootBoneName(b.name)) ??
    bones.find((b) => !(b.parent as { isBone?: boolean } | null)?.isBone) ??
    null;
  return {
    boneNames: bones.map((b) => b.name),
    rootName: rootBone?.name ?? null,
    rootRest: rootBone ? rootBone.position.length() : null,
  };
}

/** モデルに含まれるアニメをアセットにする（なければ null）。 */
export function embeddedAsset(model: LoadedModel): AnimationAsset | null {
  if (model.root.animations.length === 0) return null;
  const rig = rigInfoOf(model.root);
  return {
    id: 'embedded',
    name: model.source.fileName,
    origin: 'embedded',
    clips: model.root.animations,
    ...rig,
  };
}

/** アニメ FBX を解析してアセットにする。メッシュなどは捨てる。 */
export async function parseAnimationFile(file: FileLike, id: string): Promise<AnimationAsset> {
  const model = await loadFbxModel(file);
  try {
    const clips = model.root.animations;
    if (clips.length === 0) throw new FbxViewerError('ANIM_NO_CLIPS');
    return { id, name: file.name, origin: 'library', clips, ...rigInfoOf(model.root) };
  } finally {
    model.dispose();
  }
}

export interface PreparedClip {
  clip: AnimationClip | null;
  /** ライブラリのアニメのときだけ入る */
  report: MatchReport | null;
}

/** 選んだクリップをモデル用に変換する（ボーン照合 → クリップ変換）。 */
export function prepareClip(
  asset: AnimationAsset,
  clipIndex: number,
  rig: RigInfo,
  rootMotion: boolean,
): PreparedClip {
  const source = asset.clips[clipIndex];
  if (!source) return { clip: null, report: null };
  if (asset.origin === 'embedded') {
    return {
      clip: adaptClip(source, { mapping: null, animRoot: rig.rootName, rootMotion, rootScale: 1 }),
      report: null,
    };
  }
  const targets = [...new Set(source.tracks.map((t) => trackNodeName(t.name)))];
  const report = matchBones(rig.boneNames, targets);
  if (report.verdict === 'no-skeleton' || report.verdict === 'no-match') {
    return { clip: null, report };
  }
  const clip = adaptClip(source, {
    mapping: report.mapping,
    animRoot: report.animRoot ?? asset.rootName,
    rootMotion,
    rootScale: computeRootScale(rig.rootRest, asset.rootRest),
  });
  return { clip, report };
}

/** アニメライブラリ（保存先 + 解析済みアセットのキャッシュ）。 */
export class AnimationLibrary {
  private readonly repo: AnimationRepository;

  constructor(repo: AnimationRepository) {
    this.repo = repo;
  }

  get persistent(): boolean {
    return this.repo.persistent;
  }

  /** 保存済みのアニメをすべて読み込む。壊れているものは飛ばしてエラーを返す。 */
  async loadAll(): Promise<{ assets: AnimationAsset[]; errors: string[] }> {
    const assets: AnimationAsset[] = [];
    const errors: string[] = [];
    for (const item of await this.repo.list()) {
      try {
        assets.push(await this.parseStored(item));
      } catch (e) {
        errors.push(`${item.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { assets, errors };
  }

  async add(file: FileLike): Promise<AnimationAsset> {
    const data = await file.arrayBuffer();
    // 保存する前に解析して、アニメが入っていないファイルは弾く
    const asset = await parseAnimationFile(
      { name: file.name, size: file.size, arrayBuffer: async () => data },
      'pending',
    );
    const stored = await this.repo.save(file.name, data);
    return { ...asset, id: stored.id };
  }

  remove(id: string): Promise<void> {
    return this.repo.remove(id);
  }

  private async parseStored(item: StoredAnimation): Promise<AnimationAsset> {
    const data = await this.repo.load(item.id);
    if (!data) throw new Error('データが見つかりません');
    return parseAnimationFile(
      { name: item.name, size: data.byteLength, arrayBuffer: async () => data },
      item.id,
    );
  }
}
