/**
 * ライティングのプリセット（F-1-16）。3D ビューの光の当て方を切り替える。
 * PBR（MeshStandardMaterial）は environment の強さで映り込みが変わる。
 */
export type LightingPreset = 'studio' | 'outdoor' | 'sunset' | 'night' | 'flat';

export interface LightingSpec {
  label: string;
  /** 空と地面からの環境光 */
  hemi: { sky: string; ground: string; intensity: number };
  /** 主光源（向きはライトの向きのスライダーで回す） */
  key: { color: string; intensity: number; elevationDeg: number };
  /** 主光源の反対側から当てる補助光 */
  fill: { color: string; intensity: number } | null;
  /** 環境マップの強さ（PBR の映り込み） */
  environment: number;
}

export const LIGHTING: Record<LightingPreset, LightingSpec> = {
  studio: {
    label: 'スタジオ',
    hemi: { sky: '#ffffff', ground: '#64748b', intensity: 1.6 },
    key: { color: '#ffffff', intensity: 2.2, elevationDeg: 45 },
    fill: { color: '#ffffff', intensity: 0.8 },
    environment: 0.6,
  },
  outdoor: {
    label: '屋外（晴れ）',
    hemi: { sky: '#bfe3ff', ground: '#6b5a45', intensity: 1.3 },
    key: { color: '#fff1d6', intensity: 3.0, elevationDeg: 60 },
    fill: null,
    environment: 1.0,
  },
  sunset: {
    label: '夕方',
    hemi: { sky: '#ffb27a', ground: '#3b2a4a', intensity: 0.9 },
    key: { color: '#ff9a55', intensity: 2.6, elevationDeg: 12 },
    fill: { color: '#6c7cff', intensity: 0.6 },
    environment: 0.5,
  },
  night: {
    label: '夜',
    hemi: { sky: '#3a4a7a', ground: '#0b0f1a', intensity: 0.7 },
    key: { color: '#9fb4ff', intensity: 1.3, elevationDeg: 35 },
    fill: null,
    environment: 0.25,
  },
  flat: {
    label: 'フラット（陰影なし）',
    hemi: { sky: '#ffffff', ground: '#ffffff', intensity: 2.6 },
    key: { color: '#ffffff', intensity: 0, elevationDeg: 45 },
    fill: null,
    environment: 0.8,
  },
};

export const LIGHTING_ORDER: LightingPreset[] = ['studio', 'outdoor', 'sunset', 'night', 'flat'];

/** 既定のライトの向き（度）。正面（+Z）から右に回した角度。 */
export const DEFAULT_LIGHT_ANGLE = 37;

/** 主光源の位置。angle は水平方向の角度（0 で正面 +Z、90 で右 +X）、elevation は仰角。 */
export function keyLightPosition(
  angleDeg: number,
  elevationDeg: number,
  distance = 7,
): [number, number, number] {
  const a = (angleDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  const horizontal = Math.cos(e) * distance;
  return [Math.sin(a) * horizontal, Math.sin(e) * distance, Math.cos(a) * horizontal];
}

export function isLightingPreset(value: unknown): value is LightingPreset {
  return typeof value === 'string' && value in LIGHTING;
}
