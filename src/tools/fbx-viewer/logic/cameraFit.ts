export type Vec3 = [number, number, number];

export interface CameraFit {
  position: Vec3;
  target: Vec3;
  near: number;
  far: number;
}

/** カメラを置く方向（正面のやや右上。モデルは +Z を向いている想定）。 */
const VIEW_DIR: Vec3 = normalize([0.55, 0.35, 1]);

/** カメラの右・上方向（VIEW_DIR に直交する）。 */
const RIGHT: Vec3 = normalize(cross([0, 1, 0], VIEW_DIR));
const UP: Vec3 = cross(VIEW_DIR, RIGHT);

/**
 * バウンディングボックス全体が画面に収まるカメラの位置を求める（F-1-11）。
 * 8 つの角をカメラの向きに投影し、どの角も画角に入るぎりぎりの距離にする
 * （外接球で測るより無駄な余白が少ない）。margin は画面の端に残す余白の割合。
 */
export function computeFitCamera(
  bounds: { min: Vec3; max: Vec3 } | null,
  fovDeg: number,
  aspect: number,
  margin = 0.08,
): CameraFit {
  if (!bounds) return { position: [2, 1.5, 3], target: [0, 0.8, 0], near: 0.01, far: 100 };
  const { min, max } = bounds;
  const target: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const tanV = Math.tan((fovDeg * Math.PI) / 360) * (1 - margin * 2);
  const tanH = tanV * Math.max(aspect, 1e-3);
  let distance = 1e-3;
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) {
        const c: Vec3 = [x - target[0], y - target[1], z - target[2]];
        const toward = dot(c, VIEW_DIR);
        distance = Math.max(
          distance,
          toward + Math.abs(dot(c, RIGHT)) / tanH,
          toward + Math.abs(dot(c, UP)) / tanV,
        );
      }
    }
  }
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

/** カメラから見た点の位置（右・上・奥行き）。テストで「画角に入っているか」を確かめるのに使う。 */
export function viewSpace(fit: CameraFit, p: Vec3): Vec3 {
  const rel: Vec3 = [p[0] - fit.position[0], p[1] - fit.position[1], p[2] - fit.position[2]];
  return [dot(rel, RIGHT), dot(rel, UP), -dot(rel, VIEW_DIR)];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}
