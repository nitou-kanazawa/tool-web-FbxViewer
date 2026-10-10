import type { BufferGeometry } from 'three';

export type UvSet = 'uv' | 'uv1';

export interface UvLayout {
  /** 三角形ごとに [u0, v0, u1, v1, u2, v2] を並べた配列 */
  triangles: Float32Array;
  triangleCount: number;
  /** 0〜1 の範囲外に頂点がある三角形の番号 */
  outOfRange: number[];
}

const EPS = 1e-4;

/** ジオメトリから UV の三角形を取り出す。UV がなければ null。 */
export function extractUvLayout(geometry: BufferGeometry, set: UvSet = 'uv'): UvLayout | null {
  const uv = geometry.getAttribute(set);
  if (!uv) return null;
  const index = geometry.index;
  const count = index ? index.count : uv.count;
  const triangleCount = Math.floor(count / 3);
  const triangles = new Float32Array(triangleCount * 6);
  const outOfRange: number[] = [];
  for (let t = 0; t < triangleCount; t++) {
    let out = false;
    for (let k = 0; k < 3; k++) {
      const i = index ? index.getX(t * 3 + k) : t * 3 + k;
      const u = uv.getX(i);
      const v = uv.getY(i);
      triangles[t * 6 + k * 2] = u;
      triangles[t * 6 + k * 2 + 1] = v;
      if (u < -EPS || u > 1 + EPS || v < -EPS || v > 1 + EPS) out = true;
    }
    if (out) outOfRange.push(t);
  }
  return { triangles, triangleCount, outOfRange };
}

export interface OverlapResult {
  /** 2 枚以上の三角形が重なっているマスの数 */
  overlapCells: number;
  /** 何かしらの三角形に覆われているマスの数 */
  coveredCells: number;
  /** 重なりに関わっている三角形の番号 */
  overlappingTriangles: number[];
  /** gridSize×gridSize のマスごとの重なり枚数 */
  grid: Uint16Array;
  gridSize: number;
}

/**
 * UV の重なりを近似で求める（C-21）。0〜1 を gridSize×gridSize のマスに分け、
 * マスの中心を含む三角形の数を数える。辺の上にある中心はどの三角形にも数えない。
 * 範囲外の UV は 0〜1 に折り返さずに無視する。
 */
export function detectUvOverlap(layout: UvLayout, gridSize = 256): OverlapResult {
  const grid = new Uint16Array(gridSize * gridSize);
  const owner = new Int32Array(gridSize * gridSize).fill(-1);
  const overlapping = new Set<number>();
  const tri = layout.triangles;
  for (let t = 0; t < layout.triangleCount; t++) {
    const ax = tri[t * 6];
    const ay = tri[t * 6 + 1];
    const bx = tri[t * 6 + 2];
    const by = tri[t * 6 + 3];
    const cx = tri[t * 6 + 4];
    const cy = tri[t * 6 + 5];
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(area) < 1e-12) continue;
    const minX = clampCell(Math.min(ax, bx, cx) * gridSize - 0.5, gridSize);
    const maxX = clampCell(Math.max(ax, bx, cx) * gridSize - 0.5, gridSize, true);
    const minY = clampCell(Math.min(ay, by, cy) * gridSize - 0.5, gridSize);
    const maxY = clampCell(Math.max(ay, by, cy) * gridSize - 0.5, gridSize, true);
    for (let y = minY; y <= maxY; y++) {
      const py = (y + 0.5) / gridSize;
      for (let x = minX; x <= maxX; x++) {
        const px = (x + 0.5) / gridSize;
        const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
        const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 <= 1e-6 || w1 <= 1e-6 || w2 <= 1e-6) continue;
        const cell = y * gridSize + x;
        grid[cell]++;
        if (grid[cell] === 1) owner[cell] = t;
        else {
          overlapping.add(t);
          overlapping.add(owner[cell]);
        }
      }
    }
  }
  let overlapCells = 0;
  let coveredCells = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > 0) coveredCells++;
    if (grid[i] > 1) overlapCells++;
  }
  return {
    overlapCells,
    coveredCells,
    overlappingTriangles: [...overlapping].sort((a, b) => a - b),
    grid,
    gridSize,
  };
}

function clampCell(v: number, size: number, ceil = false): number {
  const c = ceil ? Math.ceil(v) : Math.floor(v);
  return Math.max(0, Math.min(size - 1, c));
}
