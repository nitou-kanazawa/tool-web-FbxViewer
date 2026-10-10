import { formatNumber } from '../../format';
import type { InspectionRule } from '../types';

export const uvRangeRule: InspectionRule = {
  id: 'C-20',
  title: 'UV の範囲',
  category: 'UV',
  evaluate: ({ stats }) => {
    const withUv = stats.meshes.filter((m) => m.hasUv0);
    if (withUv.length === 0) return { level: 'skip', message: 'UV がありません' };
    const out = withUv.filter((m) => m.uvOutOfRangeCount > 0);
    if (out.length > 0) {
      return {
        level: 'warn',
        message:
          '0〜1 の範囲外にはみ出した UV があります（タイリングが意図どおりか確認してください）',
        targets: out.map((m) => `${m.name}（${formatNumber(m.uvOutOfRangeCount)} 頂点）`),
      };
    }
    return { level: 'ok', message: 'UV はすべて 0〜1 の範囲内です' };
  },
};

export const uvOverlapRule: InspectionRule = {
  id: 'C-21',
  title: 'UV の重なり（近似）',
  category: 'UV',
  evaluate: ({ uvOverlaps }) => {
    if (!uvOverlaps) return { level: 'skip', message: 'ポリゴン数が多いため判定を省略しました' };
    if (uvOverlaps.length === 0) return { level: 'skip', message: 'UV がありません' };
    const overlapped = uvOverlaps.filter((o) => o.overlapRatio > 0.001);
    if (overlapped.length > 0) {
      return {
        level: 'warn',
        message: '重なっている UV があります（意図した重ね置きなら問題ありません）',
        targets: overlapped.map((o) => `${o.meshName}（${(o.overlapRatio * 100).toFixed(1)}%）`),
      };
    }
    return { level: 'ok', message: '重なりは見つかりませんでした' };
  },
};
