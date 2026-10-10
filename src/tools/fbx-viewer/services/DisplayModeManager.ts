import {
  BufferAttribute,
  Color,
  DataTexture,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshNormalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  SkinnedMesh,
  Mesh,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { boneWeightsOf, weightsToColors } from '../logic/boneWeights';

/** 面の塗り方（F-1-13, F-3-04, F-4-04, F-5-03）。 */
export type ShadingMode =
  'standard' | 'baseColor' | 'normalMap' | 'white' | 'normals' | 'checker' | 'boneWeight';

export type WireframeMode = 'off' | 'only' | 'overlay';

export interface DisplaySettings {
  shading: ShadingMode;
  wireframe: WireframeMode;
  /** boneWeight のときに表示するボーンの uuid */
  boneUuid: string | null;
}

export const SHADING_LABELS: Record<ShadingMode, string> = {
  standard: '通常',
  baseColor: 'ベースカラーのみ',
  normalMap: '法線マップのみ',
  white: 'テクスチャなし（白）',
  normals: '法線の向き',
  checker: 'チェッカー（UV 確認）',
  boneWeight: 'ボーンウェイト',
};

export const WIREFRAME_LABELS: Record<WireframeMode, string> = {
  off: 'なし',
  only: 'ワイヤーのみ',
  overlay: '重ねて表示',
};

/**
 * 1 つの元マテリアルから表示用のマテリアルを作る戦略（ストラテジーパターン）。
 * 元のマテリアルは変更しない。
 */
type MaterialFactory = (original: Material, mesh: Mesh) => Material;

interface Saved {
  material: Material | Material[];
  color?: BufferAttribute;
  hadColor: boolean;
}

/**
 * メッシュのマテリアルを一時的に差し替えて、あとで元に戻す（設計書 §5.7）。
 */
export class DisplayModeManager {
  private readonly saved = new Map<Mesh, Saved>();
  private readonly created = new Set<Material>();
  private readonly overlays: Mesh[] = [];
  private checker: DataTexture | null = null;

  apply(root: Object3D, settings: DisplaySettings) {
    this.restore();
    const factory = this.factoryFor(settings);
    const wireOnly = settings.wireframe === 'only';
    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || this.overlays.includes(mesh)) return;
      if (!factory && !wireOnly) return;
      this.saved.set(mesh, {
        material: mesh.material,
        color: mesh.geometry.getAttribute('color') as BufferAttribute | undefined,
        hadColor: mesh.geometry.hasAttribute('color'),
      });
      if (settings.shading === 'boneWeight') this.applyWeightColors(mesh, settings.boneUuid);
      const make = (m: Material) => {
        const base = factory ? factory(m, mesh) : m.clone();
        if (!factory) this.created.add(base);
        if (wireOnly && 'wireframe' in base) (base as MeshBasicMaterial).wireframe = true;
        return base;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(make) : make(mesh.material);
    });
    if (settings.wireframe === 'overlay') this.addOverlays(root);
  }

  /** すべて元に戻し、作ったマテリアルを解放する。 */
  restore() {
    for (const [mesh, s] of this.saved) {
      mesh.material = s.material;
      if (s.hadColor && s.color) mesh.geometry.setAttribute('color', s.color);
      else if (!s.hadColor) mesh.geometry.deleteAttribute('color');
    }
    this.saved.clear();
    for (const o of this.overlays) o.removeFromParent();
    this.overlays.length = 0;
    for (const m of this.created) m.dispose();
    this.created.clear();
  }

  dispose() {
    this.restore();
    this.checker?.dispose();
    this.checker = null;
  }

  private track<T extends Material>(m: T): T {
    this.created.add(m);
    return m;
  }

  private factoryFor(settings: DisplaySettings): MaterialFactory | null {
    const side = (o: Material) => o.side;
    switch (settings.shading) {
      case 'standard':
        return null;
      case 'baseColor':
        return (o) => {
          const map = (o as MeshBasicMaterial).map ?? null;
          const color = map
            ? new Color(0xffffff)
            : ((o as MeshBasicMaterial).color ?? new Color(0xcccccc));
          return this.track(new MeshBasicMaterial({ map, color, side: side(o) }));
        };
      case 'normalMap':
        return (o) => {
          const map = ((o as { normalMap?: Texture | null }).normalMap ?? null) as Texture | null;
          return this.track(
            new MeshBasicMaterial({ map, color: map ? 0xffffff : 0x8080ff, side: side(o) }),
          );
        };
      case 'white':
        return (o) => this.track(new MeshLambertMaterial({ color: 0xe5e7eb, side: side(o) }));
      case 'normals':
        return (o) => this.track(new MeshNormalMaterial({ side: side(o) }));
      case 'checker':
        return (o) =>
          this.track(new MeshLambertMaterial({ map: this.checkerTexture(), side: side(o) }));
      case 'boneWeight':
        return (o) => this.track(new MeshBasicMaterial({ vertexColors: true, side: side(o) }));
    }
  }

  private applyWeightColors(mesh: Mesh, boneUuid: string | null) {
    const skinned = mesh as SkinnedMesh;
    const count = mesh.geometry.getAttribute('position')?.count ?? 0;
    let colors: Float32Array;
    if (!skinned.isSkinnedMesh || !boneUuid) {
      colors = weightsToColors(new Float32Array(count));
    } else {
      const index = skinned.skeleton.bones.findIndex((b) => b.uuid === boneUuid);
      colors = weightsToColors(
        index >= 0 ? boneWeightsOf(mesh.geometry, index) : new Float32Array(count),
      );
    }
    mesh.geometry.setAttribute('color', new BufferAttribute(colors, 3));
  }

  private addOverlays(root: Object3D) {
    const targets: Mesh[] = [];
    root.traverse((obj) => {
      if ((obj as Mesh).isMesh) targets.push(obj as Mesh);
    });
    for (const mesh of targets) {
      const material = this.track(
        new MeshBasicMaterial({
          color: 0x22d3ee,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
        }),
      );
      let overlay: Mesh;
      const skinned = mesh as SkinnedMesh;
      if (skinned.isSkinnedMesh) {
        const s = new SkinnedMesh(mesh.geometry, material);
        s.bind(skinned.skeleton, skinned.bindMatrix);
        s.bindMode = skinned.bindMode;
        overlay = s;
      } else {
        overlay = new Mesh(mesh.geometry, material);
      }
      overlay.name = '__wireframe_overlay__';
      overlay.renderOrder = 1;
      overlay.frustumCulled = false;
      mesh.add(overlay);
      this.overlays.push(overlay);
    }
  }

  private checkerTexture(): DataTexture {
    if (this.checker) return this.checker;
    this.checker = createCheckerTexture();
    return this.checker;
  }
}

/** UV の向きが分かるチェッカー柄（U が増えると赤、V が増えると緑が強くなる）。 */
export function createCheckerTexture(size = 256, cells = 16): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const cell = size / cells;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dark = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      const i = (y * size + x) * 4;
      const r = 80 + (x / size) * 175;
      const g = 80 + (y / size) * 175;
      const k = dark ? 0.45 : 1;
      data[i] = r * k;
      data[i + 1] = g * k;
      data[i + 2] = 200 * k;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
