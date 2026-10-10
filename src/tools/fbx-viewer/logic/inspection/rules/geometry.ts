import { formatNumber } from '../../format';
import type { InspectionRule, RuleResult } from '../types';

/** 上限に対する割合で ok / warn / ng を決める。 */
export function judgeAgainstLimit(
  value: number,
  limit: number,
  warnRatio: number,
  overLevel: 'warn' | 'ng' = 'ng',
): RuleResult {
  const percent = Math.round((value / limit) * 100);
  const message = `${formatNumber(value)} / ${formatNumber(limit)}（${percent}%）`;
  if (value > limit) return { level: overLevel, message };
  if (overLevel === 'ng' && value > limit * warnRatio) return { level: 'warn', message };
  return { level: 'ok', message };
}

export const polygonCountRule: InspectionRule = {
  id: 'C-01',
  title: 'ポリゴン数',
  category: 'ジオメトリ',
  evaluate: ({ stats, preset }) =>
    judgeAgainstLimit(stats.totals.triangleCount, preset.maxTriangles, preset.warnRatio),
};

export const materialCountRule: InspectionRule = {
  id: 'C-02',
  title: 'マテリアル数',
  category: 'ジオメトリ',
  evaluate: ({ stats, preset }) =>
    judgeAgainstLimit(stats.totals.materialCount, preset.maxMaterials, preset.warnRatio, 'warn'),
};

export const sizeRule: InspectionRule = {
  id: 'C-03',
  title: 'サイズ（高さ）',
  category: 'ジオメトリ',
  evaluate: ({ stats, preset }) => {
    if (!stats.bounds) return { level: 'skip', message: 'メッシュがありません' };
    const h = stats.bounds.size[1];
    const [min, max] = preset.heightRangeMeters;
    const message = `高さ ${h.toFixed(3)} m（想定 ${min}〜${max} m）`;
    if (h < min || h > max) {
      const hint = h > max * 50 || h < min / 50 ? '。cm と m を取り違えている可能性があります' : '';
      return { level: 'warn', message: message + hint };
    }
    return { level: 'ok', message };
  },
};

export const pivotRule: InspectionRule = {
  id: 'C-04',
  title: '原点（ピボット）',
  category: 'ジオメトリ',
  evaluate: ({ stats, preset }) => {
    const b = stats.bounds;
    if (!b) return { level: 'skip', message: 'メッシュがありません' };
    const cx = (b.min[0] + b.max[0]) / 2;
    const cz = (b.min[2] + b.max[2]) / 2;
    const horizontal = Math.hypot(cx, cz);
    const vertical = Math.abs(b.min[1]);
    const hLimit = preset.pivotTolerance.horizontal * Math.max(b.size[0], b.size[2]);
    const vLimit = preset.pivotTolerance.vertical * b.size[1];
    const problems: string[] = [];
    if (horizontal > hLimit) problems.push(`水平に ${horizontal.toFixed(3)} m ずれています`);
    if (vertical > vLimit) {
      problems.push(
        b.min[1] < 0
          ? `底面が原点より ${vertical.toFixed(3)} m 下にあります`
          : `底面が原点より ${vertical.toFixed(3)} m 上にあります`,
      );
    }
    if (problems.length > 0) {
      return { level: 'warn', message: `原点が足元にありません（${problems.join('、')}）` };
    }
    return { level: 'ok', message: '原点は底面の中央付近にあります' };
  },
};

const ROTATION_EPS_DEG = 0.1;
const SCALE_EPS = 1e-4;

export const rootTransformRule: InspectionRule = {
  id: 'C-05',
  title: 'ルートの回転・スケール',
  category: 'ジオメトリ',
  evaluate: ({ stats }) => {
    const issues: string[] = [];
    for (const t of stats.topLevelTransforms) {
      const rot = t.rotationDeg.some((r) => Math.abs(r) > ROTATION_EPS_DEG);
      const scale = t.scale.some((s) => Math.abs(s - 1) > SCALE_EPS);
      if (rot)
        issues.push(`${t.name}: 回転 (${t.rotationDeg.map((r) => r.toFixed(1)).join(', ')})°`);
      if (scale)
        issues.push(`${t.name}: スケール (${t.scale.map((s) => +s.toFixed(4)).join(', ')})`);
    }
    if (issues.length > 0) {
      return {
        level: 'warn',
        message:
          '回転またはスケールが残っています。Blender で「トランスフォームを適用」してから書き出してください',
        targets: issues,
      };
    }
    return { level: 'ok', message: '回転・スケールは残っていません' };
  },
};

export const uvExistsRule: InspectionRule = {
  id: 'C-06',
  title: 'UV の有無',
  category: 'ジオメトリ',
  evaluate: ({ stats }) => {
    const missing = stats.meshes.filter((m) => !m.hasUv0).map((m) => m.name);
    if (stats.meshes.length === 0) return { level: 'skip', message: 'メッシュがありません' };
    if (missing.length > 0) {
      return {
        level: 'ng',
        message: `UV0 がないメッシュが ${missing.length} 個あります`,
        targets: missing,
      };
    }
    return { level: 'ok', message: 'すべてのメッシュに UV0 があります' };
  },
};

export const normalExistsRule: InspectionRule = {
  id: 'C-07',
  title: '法線の有無',
  category: 'ジオメトリ',
  evaluate: ({ stats }) => {
    const missing = stats.meshes.filter((m) => !m.hasNormal).map((m) => m.name);
    if (stats.meshes.length === 0) return { level: 'skip', message: 'メッシュがありません' };
    if (missing.length > 0) {
      return {
        level: 'warn',
        message: `法線がないメッシュが ${missing.length} 個あります`,
        targets: missing,
      };
    }
    return { level: 'ok', message: 'すべてのメッシュに法線があります' };
  },
};
