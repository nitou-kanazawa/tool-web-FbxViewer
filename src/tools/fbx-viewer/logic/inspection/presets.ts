/** 検品の閾値のセット（要件定義書 §9 Q2 の仮の値）。 */
export interface InspectionPreset {
  id: string;
  name: string;
  maxTriangles: number;
  maxMaterials: number;
  maxTextureSize: number;
  /** null はチェックしない */
  maxBones: number | null;
  heightRangeMeters: [number, number];
  /** 上限に対してこの割合を超えたら警告 */
  warnRatio: number;
  pivotTolerance: { horizontal: number; vertical: number };
}

export const PRESETS: InspectionPreset[] = [
  {
    id: 'mobile-character',
    name: 'モバイル（キャラ）',
    maxTriangles: 20000,
    maxMaterials: 3,
    maxTextureSize: 2048,
    maxBones: 75,
    heightRangeMeters: [0.5, 3],
    warnRatio: 0.8,
    pivotTolerance: { horizontal: 0.1, vertical: 0.05 },
  },
  {
    id: 'mobile-prop',
    name: 'モバイル（背景小物）',
    maxTriangles: 5000,
    maxMaterials: 2,
    maxTextureSize: 1024,
    maxBones: null,
    heightRangeMeters: [0.05, 5],
    warnRatio: 0.8,
    pivotTolerance: { horizontal: 0.1, vertical: 0.05 },
  },
  {
    id: 'pc',
    name: 'PC',
    maxTriangles: 100000,
    maxMaterials: 8,
    maxTextureSize: 4096,
    maxBones: 150,
    heightRangeMeters: [0.05, 10],
    warnRatio: 0.8,
    pivotTolerance: { horizontal: 0.1, vertical: 0.05 },
  },
];

export const DEFAULT_PRESET_ID = 'mobile-character';

export function findPreset(id: string): InspectionPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
