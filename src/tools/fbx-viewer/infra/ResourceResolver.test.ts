import {
  MISSING_TEXTURE_URL,
  ResourceResolver,
  baseName,
  type UrlFactory,
} from './ResourceResolver';

function fakeUrls() {
  const created: string[] = [];
  const revoked: string[] = [];
  const factory: UrlFactory = {
    create: (f) => {
      const url = `blob:${(f as File).name}`;
      created.push(url);
      return url;
    },
    revoke: (u) => revoked.push(u),
  };
  return { factory, created, revoked };
}

describe('baseName', () => {
  it.each([
    ['C:\\Users\\a\\tex\\Body.png', 'Body.png'],
    ['textures/body.png', 'body.png'],
    ['body.png', 'body.png'],
    ['../x/y.jpg?v=1', 'y.jpg'],
  ])('%s → %s', (input, expected) => {
    expect(baseName(input)).toBe(expected);
  });
});

describe('ResourceResolver', () => {
  const file = (name: string) => new File(['x'], name);

  it('Windows パスでもファイル名（大文字小文字を無視）で照合する', () => {
    const { factory } = fakeUrls();
    const r = new ResourceResolver([file('Body_BaseColor.PNG')], factory);
    expect(r.resolve('C:\\work\\textures\\body_basecolor.png')).toEqual({
      url: 'blob:Body_BaseColor.PNG',
      fileName: 'body_basecolor.png',
      status: 'found',
    });
  });

  it('同じファイルの URL は使い回す', () => {
    const { factory, created } = fakeUrls();
    const r = new ResourceResolver([file('a.png')], factory);
    r.resolve('a.png');
    r.resolve('dir/a.png');
    expect(created).toHaveLength(1);
  });

  it('見つからなければマゼンタ画像を返して missing にする', () => {
    const r = new ResourceResolver([], fakeUrls().factory);
    expect(r.resolve('textures/none.png')).toEqual({
      url: MISSING_TEXTURE_URL,
      fileName: 'none.png',
      status: 'missing',
    });
  });

  it('PSD は未対応として扱う', () => {
    const r = new ResourceResolver([file('a.psd')], fakeUrls().factory);
    expect(r.resolve('a.psd').status).toBe('unsupported');
  });

  it('埋め込み画像の Blob URL はそのまま返し、dispose で解放する', () => {
    const { factory, revoked } = fakeUrls();
    const r = new ResourceResolver([file('a.png')], factory);
    expect(r.resolve('blob:embedded-1').status).toBe('embedded');
    r.resolve('a.png');
    r.dispose();
    expect(revoked.sort()).toEqual(['blob:a.png', 'blob:embedded-1']);
  });
});
