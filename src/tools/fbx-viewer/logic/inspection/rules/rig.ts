import { judgeAgainstLimit } from './geometry';
import { formatNumber } from '../../format';
import type { InspectionRule } from '../types';

export const boneCountRule: InspectionRule = {
  id: 'C-30',
  title: 'ボーン数',
  category: 'リグ',
  evaluate: ({ stats, preset }) => {
    if (stats.totals.boneCount === 0) return { level: 'skip', message: 'リグがありません' };
    if (preset.maxBones === null) {
      return {
        level: 'skip',
        message: `${stats.totals.boneCount} 本（このプリセットではチェックしません）`,
      };
    }
    return judgeAgainstLimit(stats.totals.boneCount, preset.maxBones, preset.warnRatio, 'warn');
  },
};

export const weightCountRule: InspectionRule = {
  id: 'C-31',
  title: '1 頂点あたりのウェイト数',
  category: 'リグ',
  evaluate: ({ stats, diagnostics }) => {
    if (!stats.meshes.some((m) => m.isSkinned))
      return { level: 'skip', message: 'スキンメッシュがありません' };
    if (diagnostics.includes('WEIGHTS_TRUNCATED')) {
      return {
        level: 'warn',
        message:
          '5 本以上のウェイトを持つ頂点があります（頂点数は不明）。Unity のモバイル設定では 4 本までになります',
      };
    }
    return { level: 'ok', message: 'すべて 4 本以下です' };
  },
};

export const unweightedVertexRule: InspectionRule = {
  id: 'C-32',
  title: 'ウェイトのない頂点',
  category: 'リグ',
  evaluate: ({ stats }) => {
    const skinned = stats.meshes.filter((m) => m.isSkinned);
    if (skinned.length === 0) return { level: 'skip', message: 'スキンメッシュがありません' };
    const bad = skinned.filter((m) => m.zeroWeightVertexCount > 0);
    if (bad.length > 0) {
      return {
        level: 'ng',
        message: 'ウェイトが付いていない頂点があります（アニメ時に置き去りになります）',
        targets: bad.map((m) => `${m.name}（${formatNumber(m.zeroWeightVertexCount)} 頂点）`),
      };
    }
    return { level: 'ok', message: 'すべての頂点にウェイトがあります' };
  },
};
