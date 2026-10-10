import { analyzeModel, inspect } from '../services/analyzeModel';
import { findPreset } from '../logic/inspection/presets';
import { installObjectUrlStub, sampleFile } from '../test/samples';

beforeAll(installObjectUrlStub);
import { loadFbxModel } from './FbxModelLoader';

describe('loadFbxModel（サンプル FBX との結合テスト）', () => {
  it('リグ付きキャラクター: 統計・単位・埋め込みテクスチャ・内蔵アニメ', async () => {
    const model = await loadFbxModel(sampleFile('sample-character.fbx'));
    expect(model.source).toMatchObject({ format: 'binary', version: 7400 });
    expect(model.unitScaleFactor).toBe(1);
    expect(model.root.animations.map((a) => a.name)).toEqual(['Idle']);
    expect(model.textureSources).toHaveLength(1);
    expect(model.textureSources[0].status).toBe('embedded');

    const { stats } = analyzeModel(model);
    expect(stats.totals).toMatchObject({
      meshCount: 1,
      triangleCount: 15 * 12,
      boneCount: 16,
      clipCount: 1,
    });
    expect(stats.bounds!.size[1]).toBeCloseTo(1.78);
    expect(stats.meshes[0]).toMatchObject({
      isSkinned: true,
      zeroWeightVertexCount: 0,
      hasUv0: true,
    });
    model.dispose();
  });

  it('キューブ: 外部テクスチャの欠落と、回転・原点の警告', async () => {
    const model = await loadFbxModel(sampleFile('cube.fbx'));
    expect(model.unitScaleFactor).toBe(100);
    expect(model.textureSources.map((t) => [t.fileName, t.status])).toEqual([
      ['cube_basecolor.png', 'missing'],
    ]);
    const analysis = analyzeModel(model);
    const results = inspect(model, analysis, findPreset('mobile-prop'), [
      { name: 'cube_basecolor.png', status: 'missing', width: null, height: null },
    ]);
    const level = (id: string) => results.find((r) => r.id === id)!.level;
    expect(level('C-04')).toBe('warn');
    expect(level('C-05')).toBe('warn');
    expect(level('C-10')).toBe('ng');
    expect(level('C-21')).toBe('warn');
    expect(analysis.stats.bounds!.size.map((v) => +v.toFixed(3))).toEqual([1, 1, 1]);
    model.dispose();
  });

  it('一緒に渡した画像ファイルで外部テクスチャを解決する', async () => {
    const png = sampleFile('cube_basecolor.png');
    const image = new File([await png.arrayBuffer()], 'cube_basecolor.png', { type: 'image/png' });
    const model = await loadFbxModel(sampleFile('cube.fbx'), [image]);
    expect(model.textureSources[0].status).toBe('found');
    model.dispose();
  });

  it('FBX でないファイルは NOT_FBX', async () => {
    await expect(loadFbxModel(sampleFile('not-fbx.fbx'))).rejects.toMatchObject({
      code: 'NOT_FBX',
    });
  });
});
