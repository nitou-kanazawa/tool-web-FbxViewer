/**
 * サンプルのキャラクターを組み立てるための形状（回転体）と、
 * なめらかな法線・関節で混ざるスキンウェイトの計算。
 */
import type { Vec3 } from './fbxScene.ts';

export type UvRect = [number, number, number, number]; // u0, v0, u1, v1

export interface Part {
  name: string;
  positions: Vec3[];
  uvs: [number, number][];
  /** 頂点番号の多角形（3 角形か 4 角形） */
  polygons: number[][];
  /** 頂点ごとのボーンとウェイト */
  weights: { bone: string; w: number }[][];
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * 軸に直交する 2 本のベクトル。e2 はできるだけ正面（+Z）に向け、
 * 断面の楕円率（squash）が前後方向にかかり、θ=90° が正面になるようにする。
 */
function basis(axis: Vec3): [Vec3, Vec3] {
  if (Math.abs(axis[1]) > 0.9)
    return [
      [1, 0, 0],
      [0, 0, 1],
    ];
  const z: Vec3 = [0, 0, 1];
  const e2 = norm(sub(z, scale(axis, dot(z, axis))));
  const e1 = norm(cross(e2, axis));
  return [e1, e2];
}

/** 断面の形（軸方向の位置と半径）。半径 0 の行は極として三角形でつなぐ。 */
export interface ProfilePoint {
  t: number;
  r: number;
}

/**
 * 回転体を作る。from から to の向きに profile を並べ、segs 分割で一周させる。
 * squash は断面の楕円率（e2 方向＝前後方向の倍率）。
 */
export function lathe(opts: {
  name: string;
  from: Vec3;
  to: Vec3;
  profile: ProfilePoint[];
  segs: number;
  uv: UvRect;
  squash?: number;
  /** 列ごとに下端の行をずらす（髪の前髪など）。θ → 使わない下側の割合（0〜1） */
  cutBottom?: (theta: number) => number;
}): Part {
  const axisVec = sub(opts.to, opts.from);
  const L = len(axisVec);
  const axis = norm(axisVec);
  const [e1, e2] = basis(axis);
  const squash = opts.squash ?? 1;
  const rows = opts.profile.length;
  const positions: Vec3[] = [];
  const uvs: [number, number][] = [];
  const [u0, v0, u1, v1] = opts.uv;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i <= opts.segs; i++) {
      const theta = (i / opts.segs) * Math.PI * 2;
      let p = opts.profile[j];
      if (opts.cutBottom) {
        // 下端を列ごとに持ち上げる：プロファイルを [cut, 1] に詰め直す
        const cut = opts.cutBottom(theta);
        const s = cut + (j / (rows - 1)) * (1 - cut);
        p = sampleProfile(opts.profile, s);
      }
      const radial = add(
        scale(e1, Math.cos(theta) * p.r),
        scale(e2, Math.sin(theta) * p.r * squash),
      );
      positions.push(add(add(opts.from, scale(axis, p.t * L)), radial));
      uvs.push([u0 + (i / opts.segs) * (u1 - u0), v0 + (j / (rows - 1)) * (v1 - v0)]);
    }
  }
  const polygons: number[][] = [];
  const idx = (j: number, i: number) => j * (opts.segs + 1) + i;
  for (let j = 0; j < rows - 1; j++) {
    const poleBottom = opts.profile[j].r < 1e-6 && !opts.cutBottom;
    const poleTop = opts.profile[j + 1].r < 1e-6;
    for (let i = 0; i < opts.segs; i++) {
      const a = idx(j, i);
      const b = idx(j, i + 1);
      const c = idx(j + 1, i + 1);
      const d = idx(j + 1, i);
      if (poleBottom) polygons.push([a, c, d]);
      else if (poleTop) polygons.push([a, b, d]);
      else polygons.push([a, b, c, d]);
    }
  }
  return {
    name: opts.name,
    positions,
    uvs,
    polygons: orientOutward(positions, polygons, opts.from, axis),
    weights: [],
  };
}

function sampleProfile(profile: ProfilePoint[], s: number): ProfilePoint {
  const f = s * (profile.length - 1);
  const k = Math.min(profile.length - 2, Math.floor(f));
  const w = f - k;
  return {
    t: profile[k].t * (1 - w) + profile[k + 1].t * w,
    r: profile[k].r * (1 - w) + profile[k + 1].r * w,
  };
}

/** 面の向きを外向きにそろえる（軸からの方向と面法線を比べる）。 */
function orientOutward(
  positions: Vec3[],
  polygons: number[][],
  origin: Vec3,
  axis: Vec3,
): number[][] {
  return polygons.map((poly) => {
    const [a, b, c] = poly.map((i) => positions[i]);
    const n = cross(sub(b, a), sub(c, a));
    const center = scale(poly.map((i) => positions[i]).reduce(add, [0, 0, 0]), 1 / poly.length);
    const rel = sub(center, origin);
    const outward = sub(rel, scale(axis, dot(rel, axis)));
    // 側面は軸から外向き、極（軸上）は軸方向で判定する
    const ref = len(outward) > 1e-3 ? outward : scale(axis, dot(rel, axis) >= 0 ? 1 : -1);
    return dot(n, ref) < 0 ? [...poly].reverse() : poly;
  });
}

/** 両端が半球の円柱（腕・脚）。半径は ra から rb へ細くなる。 */
export function capsule(
  name: string,
  from: Vec3,
  to: Vec3,
  ra: number,
  rb: number,
  uv: UvRect,
  segs = 16,
): Part {
  const L = len(sub(to, from));
  const profile: ProfilePoint[] = [];
  const cap = 4;
  for (let k = 0; k <= cap; k++) {
    const phi = -Math.PI / 2 + (Math.PI / 2) * (k / cap);
    profile.push({ t: (ra * Math.sin(phi)) / L, r: ra * Math.cos(phi) });
  }
  for (let k = 1; k < 6; k++) profile.push({ t: k / 6, r: ra + (rb - ra) * (k / 6) });
  for (let k = 0; k <= cap; k++) {
    const phi = (Math.PI / 2) * (k / cap);
    profile.push({ t: 1 + (rb * Math.sin(phi)) / L, r: rb * Math.cos(phi) });
  }
  return lathe({ name, from, to, profile, segs, uv });
}

/** 楕円体（頭・手・靴など）。中心と 3 軸の半径で指定する。 */
export function ellipsoid(
  name: string,
  center: Vec3,
  radii: Vec3,
  uv: UvRect,
  segs = 20,
  rings = 12,
  cutBottom?: (theta: number) => number,
): Part {
  const profile: ProfilePoint[] = [];
  for (let k = 0; k <= rings; k++) {
    const phi = -Math.PI / 2 + Math.PI * (k / rings);
    profile.push({ t: (Math.sin(phi) + 1) / 2, r: Math.cos(phi) });
  }
  const unit = lathe({
    name,
    from: [0, -1, 0],
    to: [0, 1, 0],
    profile: profile.map((p) => ({ t: p.t, r: p.r })),
    segs,
    uv,
    cutBottom,
  });
  unit.positions = unit.positions.map((p) => [
    center[0] + p[0] * radii[0],
    center[1] + p[1] * radii[1],
    center[2] + p[2] * radii[2],
  ]);
  return unit;
}

/** すべての頂点を同じボーンに付ける。 */
export function rigid(part: Part, bone: string): Part {
  part.weights = part.positions.map(() => [{ bone, w: 1 }]);
  return part;
}

/**
 * from→to の軸に沿って、関節の近くで隣のボーンと混ぜる（ひじ・ひざがなめらかに曲がる）。
 * 関節の位置ではちょうど半々になり、range だけ離れると自分のボーンだけになる。
 */
export function blended(
  part: Part,
  bone: string,
  from: Vec3,
  to: Vec3,
  blends: { start?: { bone: string; range: number }; end?: { bone: string; range: number } },
): Part {
  const axis = norm(sub(to, from));
  const L = len(sub(to, from));
  part.weights = part.positions.map((p) => {
    const t = dot(sub(p, from), axis);
    let other: { bone: string; w: number } | null = null;
    if (blends.start && t < blends.start.range) {
      other = {
        bone: blends.start.bone,
        w: 0.5 * Math.min(1, Math.max(0, 1 - t / blends.start.range)),
      };
    } else if (blends.end && t > L - blends.end.range) {
      other = {
        bone: blends.end.bone,
        w: 0.5 * Math.min(1, Math.max(0, 1 - (L - t) / blends.end.range)),
      };
    }
    if (!other || other.w <= 0.001) return [{ bone, w: 1 }];
    return [
      { bone, w: 1 - other.w },
      { bone: other.bone, w: other.w },
    ];
  });
  return part;
}

/** 部品をまとめて 1 つのメッシュにし、なめらかな法線（継ぎ目も含めて）を計算する。 */
export function mergeParts(parts: Part[]) {
  const positions: Vec3[] = [];
  const uvsPerCorner: [number, number][][] = [];
  const polygons: number[][] = [];
  const weights: { bone: string; w: number }[][] = [];
  const normals: Vec3[] = [];
  for (const part of parts) {
    const base = positions.length;
    const partNormals = smoothNormals(part);
    positions.push(...part.positions);
    normals.push(...partNormals);
    weights.push(...part.weights);
    for (const poly of part.polygons) {
      polygons.push(poly.map((i) => base + i));
      uvsPerCorner.push(poly.map((i) => part.uvs[i]));
    }
  }
  return { positions, polygons, uvs: uvsPerCorner, normals, weights };
}

/** 同じ位置の頂点（UV の継ぎ目）をまとめて、面法線を平均する。 */
function smoothNormals(part: Part): Vec3[] {
  const key = (p: Vec3) => p.map((v) => Math.round(v * 1000)).join(',');
  const acc = new Map<string, Vec3>();
  for (const poly of part.polygons) {
    const [a, b, c] = poly.map((i) => part.positions[i]);
    const n = cross(sub(b, a), sub(c, a));
    for (const i of poly) {
      const k = key(part.positions[i]);
      acc.set(k, add(acc.get(k) ?? [0, 0, 0], n));
    }
  }
  return part.positions.map((p) => norm(acc.get(key(p)) ?? [0, 1, 0]));
}

/** UV の矩形を少し内側に縮める（隣の領域との重なりを避ける）。 */
export function inset([u0, v0, u1, v1]: UvRect, m = 0.004): UvRect {
  return [u0 + m, v0 + m, u1 - m, v1 - m];
}
