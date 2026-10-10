import { classifyFiles } from './fileIntake';

describe('classifyFiles', () => {
  it('拡張子（大文字小文字を無視）で振り分ける', () => {
    const files = ['Model.FBX', 'a.png', 'b.JPG', 'c.tga', 'd.psd', 'readme.txt'].map(
      (n) => new File([''], n),
    );
    const r = classifyFiles(files);
    expect(r.models.map((f) => f.name)).toEqual(['Model.FBX']);
    expect(r.images.map((f) => f.name)).toEqual(['a.png', 'b.JPG', 'c.tga', 'd.psd']);
    expect(r.ignored.map((f) => f.name)).toEqual(['readme.txt']);
  });
});
