import type { InspectionRule } from '../types';
import {
  materialCountRule,
  normalExistsRule,
  pivotRule,
  polygonCountRule,
  rootTransformRule,
  sizeRule,
  uvExistsRule,
} from './geometry';
import { boneCountRule, unweightedVertexRule, weightCountRule } from './rig';
import { missingTextureRule, textureSizeRule } from './texture';
import { uvOverlapRule, uvRangeRule } from './uv';

/** 検品ルールの一覧。ルールを増やすときはここに登録する（開放閉鎖の原則）。 */
export const ALL_RULES: ReadonlyArray<InspectionRule> = [
  polygonCountRule,
  materialCountRule,
  sizeRule,
  pivotRule,
  rootTransformRule,
  uvExistsRule,
  normalExistsRule,
  missingTextureRule,
  textureSizeRule,
  uvRangeRule,
  uvOverlapRule,
  boneCountRule,
  weightCountRule,
  unweightedVertexRule,
];
