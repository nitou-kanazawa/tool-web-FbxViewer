import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { adaptClip, computeRootScale, secondsToFrame } from './clipAdapter';

function clip() {
  return new AnimationClip('Walk', 1, [
    new VectorKeyframeTrack('aHips.position', [0, 1], [0, 1, 0, 2, 1.1, 3]),
    new QuaternionKeyframeTrack('aHips.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]),
    new VectorKeyframeTrack('aArm.position', [0, 1], [1, 0, 0, 1, 0, 0]),
    new VectorKeyframeTrack('aArm.scale', [0, 1], [1, 1, 1, 1, 1, 1]),
    new QuaternionKeyframeTrack('aArm.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]),
    new QuaternionKeyframeTrack('aTail.quaternion', [0, 1], [0, 0, 0, 1, 0, 0, 0, 1]),
  ]);
}

const mapping = new Map([
  ['aHips', 'mHips'],
  ['aArm', 'mArm'],
]);

describe('adaptClip', () => {
  it('名前を書き換え、腰以外の位置とスケール、対応のないトラックを捨てる', () => {
    const out = adaptClip(clip(), { mapping, animRoot: 'aHips', rootMotion: true, rootScale: 1 });
    expect(out.tracks.map((t) => t.name)).toEqual([
      'mHips.position',
      'mHips.quaternion',
      'mArm.quaternion',
    ]);
    expect(out.duration).toBe(1);
  });

  it('腰の位置に倍率を掛ける', () => {
    const out = adaptClip(clip(), { mapping, animRoot: 'aHips', rootMotion: true, rootScale: 100 });
    expect(Array.from(out.tracks[0].values)).toEqual([0, 100, 0, 200, expect.closeTo(110, 4), 300]);
  });

  it('ルートモーションがオフなら X・Z を最初のフレームに固定する', () => {
    const out = adaptClip(clip(), { mapping, animRoot: 'aHips', rootMotion: false, rootScale: 1 });
    const v = Array.from(out.tracks[0].values);
    expect(v[3]).toBeCloseTo(0);
    expect(v[4]).toBeCloseTo(1.1);
    expect(v[5]).toBeCloseTo(0);
  });

  it('元のクリップは変更しない', () => {
    const c = clip();
    adaptClip(c, { mapping, animRoot: 'aHips', rootMotion: false, rootScale: 10 });
    expect(Array.from(c.tracks[0].values)).toEqual([0, 1, 0, 2, expect.closeTo(1.1), 3]);
  });

  it('mapping が null（モデル内蔵）なら全トラックを残す', () => {
    const out = adaptClip(clip(), {
      mapping: null,
      animRoot: 'aHips',
      rootMotion: true,
      rootScale: 1,
    });
    expect(out.tracks).toHaveLength(6);
  });
});

describe('computeRootScale / secondsToFrame', () => {
  it('腰の高さの比', () => {
    expect(computeRootScale(95, 1)).toBe(95);
    expect(computeRootScale(null, 1)).toBe(1);
    expect(computeRootScale(1, 0)).toBe(1);
  });
  it('30fps で換算', () => {
    expect(secondsToFrame(1)).toBe(30);
    expect(secondsToFrame(0.5, 60)).toBe(30);
  });
});
