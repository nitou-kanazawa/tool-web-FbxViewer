import { classifyWarning, collectWarnings, formatWarnArgs } from './LoaderDiagnostics';

describe('classifyWarning', () => {
  it.each([
    ['THREE.FBXLoader: You are loading an asset with a Z-UP coordinate system.', 'Z_UP_CORRECTED'],
    [
      'THREE.FBXLoader: Vertex has more than 4 skinning weights assigned to vertex. Deleting additional weights.',
      'WEIGHTS_TRUNCATED',
    ],
    [
      'THREE.FBXLoader: layered textures are not supported in three.js. Discarding all but first layer.',
      'LAYERED_TEXTURE',
    ],
    [
      'THREE.FBXLoader: Encountered an animation stack with multiple layers, this is currently not supported.',
      'MULTI_LAYER_ANIMATION',
    ],
    [
      'THREE.FBXLoader: The FBX file contains invalid (negative) material indices.',
      'NEGATIVE_MATERIAL_INDEX',
    ],
    [
      'THREE.FBXLoader: AmbientColor map is not supported in three.js, skipping texture.',
      'UNSUPPORTED_MAP',
    ],
    ['FBXLoader: Image type "psd" is not supported.', 'UNSUPPORTED_IMAGE'],
    ['something else', 'OTHER'],
  ])('%s → %s', (raw, code) => {
    expect(classifyWarning(raw).code).toBe(code);
  });
});

describe('formatWarnArgs', () => {
  it('%s を引数で置き換える', () => {
    expect(formatWarnArgs(['%s map is not supported', 'AmbientColor'])).toBe(
      'AmbientColor map is not supported',
    );
  });
  it('複数の引数をつなげる', () => {
    expect(formatWarnArgs(['skipping', 'a.tga'])).toBe('skipping a.tga');
  });
});

describe('collectWarnings', () => {
  it('実行中の警告を集め、同じ警告は 1 件にまとめる', () => {
    const { result, diagnostics } = collectWarnings(() => {
      console.warn('THREE.FBXLoader: Vertex has more than 4 skinning weights');
      console.warn('THREE.FBXLoader: Vertex has more than 4 skinning weights');
      console.warn('other');
      return 42;
    });
    expect(result).toBe(42);
    expect(diagnostics.map((d) => d.code)).toEqual(['WEIGHTS_TRUNCATED', 'OTHER']);
  });

  it('例外が起きても console.warn を元に戻す', () => {
    const original = console.warn;
    expect(() =>
      collectWarnings(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(console.warn).toBe(original);
  });
});
