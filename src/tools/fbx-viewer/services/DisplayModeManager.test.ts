import {
  BackSide,
  BoxGeometry,
  Group,
  Mesh,
  MeshMatcapMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  Texture,
} from 'three';
import {
  DisplayModeManager,
  SHADING_GROUPS,
  SHADING_LABELS,
  createClayMatcap,
  createToonGradient,
  hasOriginalVertexColors,
  originalMaterialsOf,
} from './DisplayModeManager';

function scene() {
  const root = new Group();
  const material = new MeshPhongMaterial({ name: 'Original' });
  // 表示モードでマテリアルの型が変わるので、Mesh の型は Material のままにしておく
  const mesh: Mesh = new Mesh(new BoxGeometry(), material);
  root.add(mesh);
  return { root, mesh, material };
}

describe('DisplayModeManager', () => {
  it('表示モードを適用して、元に戻せる', () => {
    const { root, mesh, material } = scene();
    const m = new DisplayModeManager();
    m.apply(root, { shading: 'white', wireframe: 'off', boneUuid: null });
    expect(mesh.material).not.toBe(material);
    m.restore();
    expect(mesh.material).toBe(material);
  });

  it('ワイヤーのみでは元のマテリアルを変更しない', () => {
    const { root, mesh, material } = scene();
    const m = new DisplayModeManager();
    m.apply(root, { shading: 'standard', wireframe: 'only', boneUuid: null });
    expect((mesh.material as MeshPhongMaterial).wireframe).toBe(true);
    expect(material.wireframe).toBe(false);
    m.restore();
    expect(mesh.material).toBe(material);
  });

  it('重ねて表示ではワイヤーのメッシュを子に追加し、元に戻すと消す', () => {
    const { root, mesh } = scene();
    const m = new DisplayModeManager();
    m.apply(root, { shading: 'standard', wireframe: 'overlay', boneUuid: null });
    expect(mesh.children).toHaveLength(1);
    m.apply(root, { shading: 'standard', wireframe: 'off', boneUuid: null });
    expect(mesh.children).toHaveLength(0);
  });

  it('ボーンウェイト表示では頂点カラーを追加し、元に戻すと消す', () => {
    const { root, mesh } = scene();
    const m = new DisplayModeManager();
    m.apply(root, { shading: 'boneWeight', wireframe: 'off', boneUuid: null });
    expect(mesh.geometry.hasAttribute('color')).toBe(true);
    m.restore();
    expect(mesh.geometry.hasAttribute('color')).toBe(false);
  });

  it('差し替え中も、元のマテリアルと頂点カラーの有無を読める', () => {
    const { root, mesh, material } = scene();
    const m = new DisplayModeManager();
    m.apply(root, { shading: 'boneWeight', wireframe: 'off', boneUuid: null });
    expect(originalMaterialsOf(mesh)).toEqual([material]);
    expect(hasOriginalVertexColors(mesh)).toBe(false);
    m.restore();
    expect(originalMaterialsOf(mesh)).toEqual([material]);
  });

  it('見た目のシェーダー: テクスチャと色を引き継いで差し替える', () => {
    const { root, mesh, material } = scene();
    material.map = new Texture();
    const m = new DisplayModeManager();

    m.apply(root, { shading: 'pbr', wireframe: 'off', boneUuid: null });
    expect(mesh.material).toBeInstanceOf(MeshStandardMaterial);
    expect((mesh.material as MeshStandardMaterial).map).toBe(material.map);

    m.apply(root, { shading: 'toon', wireframe: 'off', boneUuid: null });
    const toon = mesh.material as MeshToonMaterial;
    expect(toon).toBeInstanceOf(MeshToonMaterial);
    expect(toon.map).toBe(material.map);
    expect((toon.gradientMap?.image as { width: number }).width).toBe(2);

    m.apply(root, { shading: 'matcap', wireframe: 'off', boneUuid: null });
    expect(mesh.material).toBeInstanceOf(MeshMatcapMaterial);

    m.restore();
    expect(mesh.material).toBe(material);
  });

  it('トゥーン + 輪郭線: 裏面だけを描く輪郭のメッシュを重ね、元に戻すと消す', () => {
    const { root, mesh } = scene();
    const m = new DisplayModeManager();
    m.apply(root, {
      shading: 'toonOutline',
      wireframe: 'overlay',
      boneUuid: null,
      outlineMeters: 0.01,
    });
    const names = mesh.children.map((c) => c.name).sort();
    expect(names).toEqual(['__outline_overlay__', '__wireframe_overlay__']);
    const outline = mesh.children.find((c) => c.name === '__outline_overlay__') as Mesh;
    expect((outline.material as MeshToonMaterial).side).toBe(BackSide);
    expect(outline.geometry).toBe(mesh.geometry);
    m.restore();
    expect(mesh.children).toHaveLength(0);
  });

  it('すべての表示モードがどこかのグループに入っている', () => {
    const grouped = SHADING_GROUPS.flatMap((g) => g.modes).sort();
    expect(grouped).toEqual(Object.keys(SHADING_LABELS).sort());
  });

  it('トゥーンの段と MatCap の画像を作れる（DOM を使わない）', () => {
    expect(createToonGradient([10, 20]).image.width).toBe(2);
    const matcap = createClayMatcap(16);
    expect(matcap.image.width).toBe(16);
    // 光が当たる左上は、反対側の右下より明るい（DataTexture は下の行から並ぶ）
    const data = matcap.image.data as Uint8Array;
    const upperLeft = (12 * 16 + 4) * 4;
    const lowerRight = (4 * 16 + 12) * 4;
    expect(data[upperLeft]).toBeGreaterThan(data[lowerRight]);
  });
});
