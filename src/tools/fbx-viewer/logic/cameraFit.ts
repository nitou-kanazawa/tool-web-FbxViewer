export type Vec3 = [number, number, number];

export interface CameraFit {
  position: Vec3;
  target: Vec3;
  near: number;
  far: number;
}

/** カメラを置く方向（正面のやや右上。モデルは +Z を向いている想定）。 */
const VIEW_DIR: Vec3 = normalize([0.55, 0.35, 1]);

/** バウンディングボックス全体が画面に収まるカメラの位置を求める（F-1-11）。 */
export function computeFitCamera(
  bounds: { min: Vec3; max: Vec3 } | null,
  fovDeg: number,
  aspect: number,
  margin = 1.15,
): CameraFit {
  if (!bounds) return { position: [2, 1.5, 3], target: [0, 0.8, 0], near: 0.01, far: 100 };
  const target: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const radius = Math.max(
    Math.hypot(
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2],
    ) / 2,
    1e-3,
  );
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 1e-3));
  const fov = Math.min(vFov, hFov);
  const distance = (radius / Math.sin(fov / 2)) * margin;
  return {
    position: [
      target[0] + VIEW_DIR[0] * distance,
      target[1] + VIEW_DIR[1] * distance,
      target[2] + VIEW_DIR[2] * distance,
    ],
    target,
    near: Math.max(distance / 1000, 1e-4),
    far: distance * 100,
  };
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}
