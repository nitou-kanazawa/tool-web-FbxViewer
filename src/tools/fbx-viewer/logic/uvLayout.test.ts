import { BufferGeometry, Float32BufferAttribute, PlaneGeometry } from 'three';
import { detectUvOverlap, extractUvLayout } from './uvLayout';

function quads(uvSets: number[][]) {
  // 2 枚の三角形からなる四角形を、指定した UV の矩形 [u0, v0, u1, v1] で並べる
  const uv: number[] = [];
  const pos: number[] = [];
  for (const [u0, v0, u1, v1] of uvSets) {
    uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    pos.push(...new Array(18).fill(0));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

describe('extractUvLayout', () => {
  it('インデックス付きのジオメトリから三角形を取り出す', () => {
    const layout = extractUvLayout(new PlaneGeometry())!;
    expect(layout.triangleCount).toBe(2);
    expect(layout.outOfRange).toEqual([]);
  });

  it('範囲外の三角形を検出する', () => {
    const layout = extractUvLayout(
      quads([
        [0, 0, 0.5, 0.5],
        [0.8, 0.8, 1.2, 1],
      ]),
    )!;
    expect(layout.outOfRange).toEqual([2, 3]);
  });

  it('UV がなければ null', () => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
    expect(extractUvLayout(g)).toBeNull();
  });
});

describe('detectUvOverlap', () => {
  it('隣り合う四角形は重ならない', () => {
    const r = detectUvOverlap(
      extractUvLayout(
        quads([
          [0, 0, 0.5, 0.5],
          [0.5, 0, 1, 0.5],
        ]),
      )!,
      64,
    );
    expect(r.overlapCells).toBe(0);
    expect(r.coveredCells).toBeGreaterThan(0);
  });

  it('同じ場所に置いた四角形は重なる', () => {
    const r = detectUvOverlap(
      extractUvLayout(
        quads([
          [0, 0, 0.5, 0.5],
          [0, 0, 0.5, 0.5],
        ]),
      )!,
      64,
    );
    expect(r.overlapCells / r.coveredCells).toBeGreaterThan(0.9);
    expect(r.overlappingTriangles).toEqual([0, 1, 2, 3]);
  });
});
