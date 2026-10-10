import type { ModelStats } from '../modelStats';
import { findPreset } from './presets';
import { runInspection, summarize } from './runInspection';
import type { InspectionContext, InspectionRule } from './types';

function stats(
  patch: Partial<ModelStats> = {},
  totals: Partial<ModelStats['totals']> = {},
): ModelStats {
  return {
    meshes: [
      {
        name: 'Body',
        vertexCount: 100,
        triangleCount: 100,
        materialNames: ['M'],
        isSkinned: true,
        hasUv0: true,
        hasUv1: false,
        hasNormal: true,
        uvOutOfRangeCount: 0,
        zeroWeightVertexCount: 0,
        morphTargetCount: 0,
      },
    ],
    totals: {
      meshCount: 1,
      vertexCount: 100,
      triangleCount: 100,
      materialCount: 1,
      textureCount: 0,
      boneCount: 20,
      clipCount: 0,
      morphTargetCount: 0,
      ...totals,
    },
    bounds: { size: [0.6, 1.7, 0.3], min: [-0.3, 0, -0.15], max: [0.3, 1.7, 0.15] },
    unitScaleFactor: 1,
    upAxis: 'Y',
    topLevelTransforms: [{ name: 'Root', rotationDeg: [0, 0, 0], scale: [1, 1, 1] }],
    ...patch,
  };
}

function ctx(patch: Partial<InspectionContext> = {}): InspectionContext {
  return {
    stats: stats(),
    diagnostics: [],
    textures: [],
    uvOverlaps: [{ meshName: 'Body', overlapRatio: 0 }],
    preset: findPreset('mobile-character'),
    ...patch,
  };
}

const level = (c: InspectionContext, id: string) =>
  runInspection(c).find((r) => r.id === id)!.level;

describe('検品ルール', () => {
  it('問題のないモデルはすべて ok か skip', () => {
    const results = runInspection(ctx());
    expect(summarize(results).warn + summarize(results).ng).toBe(0);
  });

  it.each([
    [16000, 'ok'],
    [16001, 'warn'],
    [20000, 'warn'],
    [20001, 'ng'],
  ])('C-01 ポリゴン数 %i → %s（上限 20,000・警告 80%）', (tri, expected) => {
    expect(level(ctx({ stats: stats({}, { triangleCount: tri }) }), 'C-01')).toBe(expected);
  });

  it('C-03 cm/m の取り違え（高さ 170m）は警告', () => {
    const s = stats({ bounds: { size: [60, 170, 30], min: [-30, 0, -15], max: [30, 170, 15] } });
    const r = runInspection(ctx({ stats: s })).find((x) => x.id === 'C-03')!;
    expect(r.level).toBe('warn');
    expect(r.message).toContain('取り違え');
  });

  it('C-04 原点が中心にあるモデルは警告', () => {
    const s = stats({ bounds: { size: [1, 1, 1], min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] } });
    expect(level(ctx({ stats: s }), 'C-04')).toBe('warn');
  });

  it('C-05 回転・スケールが残っていたら警告', () => {
    const s = stats({
      topLevelTransforms: [{ name: 'Body', rotationDeg: [-90, 0, 0], scale: [1, 1, 1] }],
    });
    expect(level(ctx({ stats: s }), 'C-05')).toBe('warn');
    const s2 = stats({
      topLevelTransforms: [{ name: 'Body', rotationDeg: [0, 0, 0], scale: [100, 100, 100] }],
    });
    expect(level(ctx({ stats: s2 }), 'C-05')).toBe('warn');
  });

  it('C-06 UV がないメッシュは NG', () => {
    const s = stats({ meshes: [{ ...stats().meshes[0], hasUv0: false }] });
    expect(level(ctx({ stats: s }), 'C-06')).toBe('ng');
  });

  it('C-10 テクスチャの欠落は NG、読み込み中は skip', () => {
    expect(
      level(
        ctx({ textures: [{ name: 'a.png', status: 'missing', width: null, height: null }] }),
        'C-10',
      ),
    ).toBe('ng');
    expect(level(ctx({ textures: undefined }), 'C-10')).toBe('skip');
  });

  it('C-11 解像度の上限超えは NG、2 のべき乗でなければ警告', () => {
    const t = (w: number, h: number) => ({
      name: 't',
      status: 'found' as const,
      width: w,
      height: h,
    });
    expect(level(ctx({ textures: [t(4096, 4096)] }), 'C-11')).toBe('ng');
    expect(level(ctx({ textures: [t(300, 300)] }), 'C-11')).toBe('warn');
    expect(level(ctx({ textures: [t(1024, 512)] }), 'C-11')).toBe('ok');
  });

  it('C-20 / C-21 UV の範囲外と重なりは警告', () => {
    const s = stats({ meshes: [{ ...stats().meshes[0], uvOutOfRangeCount: 3 }] });
    expect(level(ctx({ stats: s }), 'C-20')).toBe('warn');
    expect(level(ctx({ uvOverlaps: [{ meshName: 'Body', overlapRatio: 0.5 }] }), 'C-21')).toBe(
      'warn',
    );
    expect(level(ctx({ uvOverlaps: undefined }), 'C-21')).toBe('skip');
  });

  it('C-30〜C-32 リグ', () => {
    expect(level(ctx({ stats: stats({}, { boneCount: 80 }) }), 'C-30')).toBe('warn');
    expect(level(ctx({ preset: findPreset('mobile-prop') }), 'C-30')).toBe('skip');
    expect(level(ctx({ diagnostics: ['WEIGHTS_TRUNCATED'] }), 'C-31')).toBe('warn');
    const s = stats({ meshes: [{ ...stats().meshes[0], zeroWeightVertexCount: 5 }] });
    expect(level(ctx({ stats: s }), 'C-32')).toBe('ng');
  });

  it('ルールが例外を投げても全体は止まらず skip になる', () => {
    const broken: InspectionRule = {
      id: 'X',
      title: '壊れたルール',
      category: 'ジオメトリ',
      evaluate: () => {
        throw new Error('oops');
      },
    };
    const [r] = runInspection(ctx(), [broken]);
    expect(r.level).toBe('skip');
    expect(r.message).toContain('oops');
  });
});
