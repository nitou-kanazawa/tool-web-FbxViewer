import { MemoryAnimationRepository } from '../infra/AnimationRepository';
import { loadFbxModel } from '../infra/FbxModelLoader';
import { installObjectUrlStub, sampleFile } from '../test/samples';

beforeAll(installObjectUrlStub);
import { AnimationLibrary, embeddedAsset, prepareClip, rigInfoOf } from './AnimationService';

describe('AnimationService', () => {
  it('Mixamo 風のアニメ（接頭辞・単位が違う）をキャラクターに当てられる', async () => {
    const model = await loadFbxModel(sampleFile('sample-character.fbx'));
    const rig = rigInfoOf(model.root);
    expect(rig.rootName).toBe('mixamorigHips');
    expect(rig.rootRest).toBeCloseTo(92);

    const library = new AnimationLibrary(new MemoryAnimationRepository());
    const walk = await library.add(sampleFile('anim-walk.fbx'));
    expect(walk.rootName).toBe('mixamorig1Hips');

    const { clip, report } = prepareClip(walk, 0, rig, true);
    expect(report!.verdict).toBe('ok');
    expect(report!.matchedCount).toBe(7);
    const hips = clip!.tracks.find((t) => t.name === 'mixamorigHips.position')!;
    // アニメ側は m 単位・腰 1.0m、モデル側は cm 単位・腰 92 → 移動量は 92 倍
    expect(hips.values[1]).toBeCloseTo(92, 0);
    expect(hips.values[hips.values.length - 1]).toBeCloseTo(1.4 * 92, 0);

    const fixed = prepareClip(walk, 0, rig, false).clip!;
    const fixedHips = fixed.tracks.find((t) => t.name === 'mixamorigHips.position')!;
    expect(fixedHips.values[fixedHips.values.length - 1]).toBeCloseTo(0);
    model.dispose();
  });

  it('リグのないモデルには当てられない', async () => {
    const cube = await loadFbxModel(sampleFile('cube.fbx'));
    const library = new AnimationLibrary(new MemoryAnimationRepository());
    const wave = await library.add(sampleFile('anim-wave.fbx'));
    const { clip, report } = prepareClip(wave, 0, rigInfoOf(cube.root), true);
    expect(clip).toBeNull();
    expect(report!.verdict).toBe('no-skeleton');
    cube.dispose();
  });

  it('アニメのないファイルは追加できない', async () => {
    const library = new AnimationLibrary(new MemoryAnimationRepository());
    await expect(library.add(sampleFile('cube.fbx'))).rejects.toMatchObject({
      code: 'ANIM_NO_CLIPS',
    });
    expect((await library.loadAll()).assets).toHaveLength(0);
  });

  it('保存したアニメを読み直せる・削除できる', async () => {
    const library = new AnimationLibrary(new MemoryAnimationRepository());
    const a = await library.add(sampleFile('anim-wave.fbx'));
    expect((await library.loadAll()).assets.map((x) => x.clips[0].name)).toEqual(['Wave']);
    await library.remove(a.id);
    expect((await library.loadAll()).assets).toHaveLength(0);
  });

  it('モデル内蔵のアニメはそのまま使う', async () => {
    const model = await loadFbxModel(sampleFile('sample-character.fbx'));
    const asset = embeddedAsset(model)!;
    const { clip, report } = prepareClip(asset, 0, rigInfoOf(model.root), true);
    expect(report).toBeNull();
    expect(clip!.tracks).toHaveLength(asset.clips[0].tracks.length);
    model.dispose();
  });
});
