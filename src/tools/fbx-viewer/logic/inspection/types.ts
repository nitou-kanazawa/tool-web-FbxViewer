import type { DiagnosticCode } from '../../infra/LoaderDiagnostics';
import type { ResourceStatus } from '../../infra/ResourceResolver';
import type { ModelStats } from '../modelStats';
import type { InspectionPreset } from './presets';

export type Level = 'ok' | 'warn' | 'ng' | 'skip';

export interface TextureFacts {
  name: string;
  status: ResourceStatus;
  width: number | null;
  height: number | null;
}

export interface UvOverlapFacts {
  meshName: string;
  /** 覆われているマスのうち、重なっているマスの割合（0〜1） */
  overlapRatio: number;
}

/** ルールに渡す情報。モデル全体ではなく必要なものだけを持つ（インターフェース分離）。 */
export interface InspectionContext {
  stats: ModelStats;
  diagnostics: ReadonlyArray<DiagnosticCode>;
  /** テクスチャの読み込みが終わるまでは undefined */
  textures?: ReadonlyArray<TextureFacts>;
  /** UV の重なり（計算を省略したときは undefined） */
  uvOverlaps?: ReadonlyArray<UvOverlapFacts>;
  preset: InspectionPreset;
}

export interface RuleResult {
  level: Level;
  message: string;
  /** 該当するメッシュ名やテクスチャ名 */
  targets?: string[];
}

export interface InspectionRule {
  id: string;
  title: string;
  category: 'ジオメトリ' | 'テクスチャ' | 'UV' | 'リグ';
  evaluate(ctx: InspectionContext): RuleResult;
}

export interface InspectionResult extends RuleResult {
  id: string;
  title: string;
  category: InspectionRule['category'];
}
