import type { ModelStats } from './modelStats';
import { inspectionToMarkdown } from './report';

describe('inspectionToMarkdown', () => {
  it('表形式の Markdown にする', () => {
    const stats = {
      totals: { triangleCount: 1200, vertexCount: 800, materialCount: 2, boneCount: 0 },
      bounds: { size: [1, 2, 0.5] },
    } as unknown as ModelStats;
    const md = inspectionToMarkdown({
      fileName: 'a.fbx',
      presetName: 'PC',
      stats,
      results: [
        {
          id: 'C-01',
          title: 'ポリゴン数',
          category: 'ジオメトリ',
          level: 'ok',
          message: '1,200 / 100,000',
        },
        {
          id: 'C-10',
          title: 'テクスチャの欠落',
          category: 'テクスチャ',
          level: 'ng',
          message: 'a|b',
          targets: ['x.png'],
        },
      ],
    });
    expect(md).toContain('### 検品結果: a.fbx');
    expect(md).toContain('1.000m × 2.000m × 0.500m');
    expect(md).toContain('| ✅ | C-01 | ポリゴン数 | 1,200 / 100,000 |');
    expect(md).toContain('| ❌ | C-10 | テクスチャの欠落 | a\\|b（x.png） |');
  });
});
