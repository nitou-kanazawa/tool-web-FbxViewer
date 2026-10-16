import { BoxGeometry, Group, Mesh, MeshPhongMaterial } from 'three';
import {
  DisplayModeManager,
  hasOriginalVertexColors,
  originalMaterialsOf,
} from './DisplayModeManager';

function scene() {
  const root = new Group();
  const material = new MeshPhongMaterial({ name: 'Original' });
  const mesh = new Mesh(new BoxGeometry(), material);
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
});
