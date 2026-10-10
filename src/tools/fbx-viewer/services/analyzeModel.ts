import type { LoadedModel } from '../infra/FbxModelLoader';
import { runInspection } from '../logic/inspection/runInspection';
import type { InspectionPreset } from '../logic/inspection/presets';
import type { InspectionResult, TextureFacts, UvOverlapFacts } from '../logic/inspection/types';
import { computeModelStats, type ModelStats } from '../logic/modelStats';
import { collectMaterials, textureSize, type MaterialInfo } from '../logic/textures';
import { detectUvOverlap, extractUvLayout } from '../logic/uvLayout';
import type { Mesh } from 'three';

/** UV の重なりを計算するポリゴン数の上限（これを超えたら C-21 を省略する）。 */
const UV_OVERLAP_TRIANGLE_LIMIT = 300_000;

export interface ModelAnalysis {
  stats: ModelStats;
  materials: MaterialInfo[];
  uvOverlaps?: UvOverlapFacts[];
}

/** 読み込み直後に 1 回だけ行う解析（統計・マテリアル・UV の重なり）。 */
export function analyzeModel(model: LoadedModel): ModelAnalysis {
  const zUpCorrected = model.diagnostics.some((d) => d.code === 'Z_UP_CORRECTED');
  const stats = computeModelStats(model.root, {
    unitScaleFactor: model.unitScaleFactor,
    zUpCorrected,
  });
  return {
    stats,
    materials: collectMaterials(model.root),
    uvOverlaps:
      stats.totals.triangleCount <= UV_OVERLAP_TRIANGLE_LIMIT
        ? computeUvOverlaps(model)
        : undefined,
  };
}

function computeUvOverlaps(model: LoadedModel): UvOverlapFacts[] {
  const result: UvOverlapFacts[] = [];
  model.root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const layout = extractUvLayout(mesh.geometry, 'uv');
    if (!layout) return;
    const overlap = detectUvOverlap(layout, 256);
    result.push({
      meshName: mesh.name || '(名前なし)',
      overlapRatio: overlap.coveredCells > 0 ? overlap.overlapCells / overlap.coveredCells : 0,
    });
  });
  return result;
}

/** テクスチャの読み込み結果を検品用の事実にする。 */
export function collectTextureFacts(model: LoadedModel): TextureFacts[] {
  return model.textureSources.map((s) => {
    const size =
      s.status === 'missing' || s.status === 'unsupported' ? null : textureSize(s.texture);
    return {
      name: s.fileName || s.texture.name || '(埋め込み)',
      status: s.status,
      width: size?.width ?? null,
      height: size?.height ?? null,
    };
  });
}

export function inspect(
  model: LoadedModel,
  analysis: ModelAnalysis,
  preset: InspectionPreset,
  textures: TextureFacts[] | undefined,
): InspectionResult[] {
  return runInspection({
    stats: analysis.stats,
    diagnostics: model.diagnostics.map((d) => d.code),
    textures,
    uvOverlaps: analysis.uvOverlaps,
    preset,
  });
}
