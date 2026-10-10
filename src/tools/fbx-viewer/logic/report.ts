import type { InspectionResult } from './inspection/types';
import type { ModelStats } from './modelStats';
import { formatNumber } from './format';

const ICON = { ok: '✅', warn: '⚠️', ng: '❌', skip: '➖' } as const;

/** 検品結果を Markdown にする（F-0-04。Slack や PR に貼る用）。 */
export function inspectionToMarkdown(input: {
  fileName: string;
  presetName: string;
  stats: ModelStats;
  results: ReadonlyArray<InspectionResult>;
}): string {
  const { stats, results } = input;
  const size = stats.bounds ? stats.bounds.size.map((v) => `${v.toFixed(3)}m`).join(' × ') : '―';
  const lines = [
    `### 検品結果: ${input.fileName}`,
    '',
    `- プリセット: ${input.presetName}`,
    `- ポリゴン: ${formatNumber(stats.totals.triangleCount)} / 頂点: ${formatNumber(stats.totals.vertexCount)} / マテリアル: ${stats.totals.materialCount} / ボーン: ${stats.totals.boneCount}`,
    `- 大きさ（幅 × 高さ × 奥行き）: ${size}`,
    '',
    '| 判定 | ID | 項目 | 内容 |',
    '| --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${ICON[r.level]} | ${r.id} | ${r.title} | ${escapeCell(r.message)}${
          r.targets?.length ? `（${escapeCell(r.targets.join(', '))}）` : ''
        } |`,
    ),
  ];
  return lines.join('\n');
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
