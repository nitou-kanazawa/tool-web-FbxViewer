import {
  Bone,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
} from 'three';
import { computeModelStats, triangleCount } from './modelStats';

describe('triangleCount', () => {
  it('インデックスあり', () => {
    expect(triangleCount(new BoxGeometry())).toBe(12);
  });
  it('インデックスなし', () => {
    expect(triangleCount(new BoxGeometry().toNonIndexed())).toBe(12);
  });
});

describe('computeModelStats', () => {
  it('合計・マテリアルの重複除去・単位換算', () => {
    const root = new Group();
    const shared = new MeshBasicMaterial({ name: 'Shared' });
    const a = new Mesh(new BoxGeometry(100, 200, 100), shared);
    a.position.y = 100; // 底面が原点
    a.name = 'A';
    const b = new Mesh(new BoxGeometry(10, 10, 10), shared);
    b.name = 'B';
    root.add(a, b);

    const s = computeModelStats(root, { unitScaleFactor: 1, zUpCorrected: false });
    expect(s.totals.meshCount).toBe(2);
    expect(s.totals.triangleCount).toBe(24);
    expect(s.totals.materialCount).toBe(1);
    // 1 単位 = 1cm。上端 200 単位（2m）〜下端 -5 単位（B の下面）
    expect(s.bounds!.size[1]).toBeCloseTo(2.05);
    expect(s.bounds!.min[1]).toBeCloseTo(-0.05);
    expect(s.meshes[0]).toMatchObject({
      name: 'A',
      hasUv0: true,
      hasNormal: true,
      uvOutOfRangeCount: 0,
    });
    expect(s.upAxis).toBe('Y');
  });

  it('UV の範囲外とスキンのウェイト 0 の頂点を数える', () => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1.5, 0, 0, -0.2], 2));
    g.setAttribute('skinIndex', new Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4));
    g.setAttribute(
      'skinWeight',
      new Float32BufferAttribute([1, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0, 0], 4),
    );
    const bone = new Bone();
    const mesh = new SkinnedMesh(g, new MeshBasicMaterial());
    mesh.add(bone);
    mesh.bind(new Skeleton([bone]));
    const root = new Group();
    root.add(mesh);
    const s = computeModelStats(root, { unitScaleFactor: 100, zUpCorrected: false });
    expect(s.meshes[0].uvOutOfRangeCount).toBe(2);
    expect(s.meshes[0].zeroWeightVertexCount).toBe(1);
    expect(s.meshes[0].hasNormal).toBe(false);
    expect(s.totals.boneCount).toBe(1);
  });

  it('最上位ノードの回転を記録し、Z-up 補正の回転は除外する', () => {
    const root = new Group();
    root.rotation.x = -Math.PI / 2; // ローダーによる補正
    const child = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    child.name = 'Child';
    child.rotation.x = -Math.PI / 2;
    child.scale.set(100, 100, 100);
    root.add(child);
    const s = computeModelStats(root, { unitScaleFactor: 1, zUpCorrected: true });
    expect(s.topLevelTransforms[0].rotationDeg.every((r) => Math.abs(r) < 1e-6)).toBe(true);
    expect(s.topLevelTransforms[1].name).toBe('Child');
    expect(s.topLevelTransforms[1].rotationDeg[0]).toBeCloseTo(-90);
    expect(s.topLevelTransforms[1].scale).toEqual([100, 100, 100]);
    expect(s.upAxis).toBe('Z');
  });

  it('メッシュがなければ bounds は null', () => {
    expect(
      computeModelStats(new Group(), { unitScaleFactor: 1, zUpCorrected: false }).bounds,
    ).toBeNull();
  });
});
