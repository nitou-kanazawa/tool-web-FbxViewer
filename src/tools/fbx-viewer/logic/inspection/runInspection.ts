import { ALL_RULES } from './rules';
import type { InspectionContext, InspectionResult, InspectionRule } from './types';

/**
 * ルールを順に評価する。ルールが例外を投げても全体は止めず、そのルールを skip にする。
 */
export function runInspection(
  ctx: InspectionContext,
  rules: ReadonlyArray<InspectionRule> = ALL_RULES,
): InspectionResult[] {
  return rules.map((rule) => {
    try {
      return { id: rule.id, title: rule.title, category: rule.category, ...rule.evaluate(ctx) };
    } catch (e) {
      return {
        id: rule.id,
        title: rule.title,
        category: rule.category,
        level: 'skip',
        message: `判定できませんでした（${e instanceof Error ? e.message : String(e)}）`,
      };
    }
  });
}

/** 結果の件数を集計する。 */
export function summarize(results: ReadonlyArray<InspectionResult>) {
  return {
    ok: results.filter((r) => r.level === 'ok').length,
    warn: results.filter((r) => r.level === 'warn').length,
    ng: results.filter((r) => r.level === 'ng').length,
    skip: results.filter((r) => r.level === 'skip').length,
  };
}
