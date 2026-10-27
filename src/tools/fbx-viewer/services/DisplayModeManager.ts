import {
  BackSide,
  BufferAttribute,
  Color,
  DataTexture,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshMatcapMaterial,
  MeshNormalMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  SkinnedMesh,
  Mesh,
  Vector3,
  type Material,
  type MeshPhongMaterial,
  type Object3D,
  type Texture,
} from 'three';
import { boneWeightsOf, weightsToColors } from '../logic/boneWeights';

const ORIGINAL_KEY = '__displayModeOriginal';
const WIREFRAME_NAME = '__wireframe_overlay__';
const OUTLINE_NAME = '__outline_overlay__';

/** 元のマテリアルから、シェーダーを替えても引き継ぐ表面の設定を取り出す。 */
function surfaceOf(o: Material) {
  const m = o as Partial<MeshPhongMaterial> & Material;
  return {
    map: m.map ?? null,
    normalMap: m.normalMap ?? null,
    alphaMap: m.alphaMap ?? null,
    color: m.color?.clone() ?? new Color(0xffffff),
    side: o.side,
    transparent: o.transparent,
    opacity: o.opacity,
    alphaTest: o.alphaTest,
  };
}

interface OriginalState {
  material: Material | Material[];
  hadColor: boolean;
}

/** 表示モードで差し替える前の、元のマテリアル（差し替えていなければ今のマテリアル）。 */
export function originalMaterialsOf(mesh: Mesh): Material[] {
  const original = mesh.userData[ORIGINAL_KEY] as OriginalState | undefined;
  const m = original ? original.material : mesh.material;
  return (Array.isArray(m) ? m : [m]).filter(Boolean);
}

/** 元のジオメトリに頂点カラーがあったか（ウェイト表示で一時的に付けた色は除く）。 */
export function hasOriginalVertexColors(mesh: Mesh): boolean {
  const original = mesh.userData[ORIGINAL_KEY] as OriginalState | undefined;
  return original ? original.hadColor : mesh.geometry.hasAttribute('color');
}

/**
 * 面の塗り方（F-1-13, F-3-04, F-4-04, F-5-03）。
 * 「見た目」は質感の違うシェーダーで見え方を試すもの、「確認用」はデータを調べるもの。
 */
export type ShadingMode =
  | 'standard'
  | 'pbr'
  | 'toon'
  | 'toonOutline'
  | 'matcap'
  | 'baseColor'
  | 'white'
  | 'normalMap'
  | 'normals'
  | 'checker'
  | 'boneWeight';

export type WireframeMode = 'off' | 'only' | 'overlay';

export interface DisplaySettings {
  shading: ShadingMode;
  wireframe: WireframeMode;
  /** boneWeight のときに表示するボーンの uuid */
  boneUuid: string | null;
  /** 輪郭線の太さ（メートル）。モデルの大きさに合わせて渡す */
  outlineMeters?: number;
}

export const SHADING_LABELS: Record<ShadingMode, string> = {
  standard: 'Phong（読み込んだまま）',
  pbr: 'PBR（Standard）',
  toon: 'トゥーン',
  toonOutline: 'トゥーン + 輪郭線',
  matcap: 'MatCap（形の確認）',
  baseColor: 'アンリット（ライトなし）',
  white: 'クレイ（白）',
  normalMap: '法線マップのみ',
  normals: '法線の向き',
  checker: 'チェッカー（UV 確認）',
  boneWeight: 'ボーンウェイト',
};

/** 選択肢のグループ（画面のプルダウンで分けて表示する）。 */
export const SHADING_GROUPS: { label: string; modes: ShadingMode[] }[] = [
  { label: '見た目', modes: ['standard', 'pbr', 'toon', 'toonOutline', 'matcap', 'baseColor'] },
  { label: '確認用', modes: ['white', 'normalMap', 'normals', 'checker', 'boneWeight'] },
];

/** 既定の輪郭線の太さ（メートル） */
const DEFAULT_OUTLINE_METERS = 0.006;

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
  private toonGradient: DataTexture | null = null;
  private matcap: DataTexture | null = null;

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
      // 画面（インスペクターや UV エディタ）が元のマテリアルを読めるように残しておく
      mesh.userData[ORIGINAL_KEY] = {
        material: mesh.material,
        hadColor: mesh.geometry.hasAttribute('color'),
      } satisfies OriginalState;
      if (settings.shading === 'boneWeight') this.applyWeightColors(mesh, settings.boneUuid);
      const make = (m: Material) => {
        const base = factory ? factory(m, mesh) : m.clone();
        if (!factory) this.created.add(base);
        if (wireOnly && 'wireframe' in base) (base as MeshBasicMaterial).wireframe = true;
        return base;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(make) : make(mesh.material);
    });
    if (settings.shading === 'toonOutline') {
      const meters = settings.outlineMeters ?? DEFAULT_OUTLINE_METERS;
      this.addOverlays(root, OUTLINE_NAME, (mesh) => this.outlineMaterial(mesh, meters), -1);
    }
    if (settings.wireframe === 'overlay') {
      this.addOverlays(
        root,
        WIREFRAME_NAME,
        () =>
          this.track(
            new MeshBasicMaterial({
              color: 0x22d3ee,
              wireframe: true,
              transparent: true,
              opacity: 0.6,
            }),
          ),
        1,
      );
    }
  }

  /** すべて元に戻し、作ったマテリアルを解放する。 */
  restore() {
    for (const [mesh, s] of this.saved) {
      mesh.material = s.material;
      delete mesh.userData[ORIGINAL_KEY];
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
    for (const t of [this.checker, this.toonGradient, this.matcap]) t?.dispose();
    this.checker = null;
    this.toonGradient = null;
    this.matcap = null;
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
      case 'pbr':
        return (o) =>
          this.track(
            new MeshStandardMaterial({
              ...surfaceOf(o),
              roughness: 0.65,
              metalness: 0,
              envMapIntensity: 1,
            }),
          );
      case 'toon':
      case 'toonOutline':
        return (o) =>
          this.track(
            new MeshToonMaterial({ ...surfaceOf(o), gradientMap: this.toonGradientTexture() }),
          );
      case 'matcap':
        return (o) =>
          this.track(
            new MeshMatcapMaterial({
              matcap: this.matcapTexture(),
              side: side(o),
              normalMap: surfaceOf(o).normalMap,
            }),
          );
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

  /** 元のメッシュと同じジオメトリ（スキンメッシュなら同じスケルトン）で重ねるメッシュを足す。 */
  private addOverlays(
    root: Object3D,
    name: string,
    makeMaterial: (mesh: Mesh) => Material,
    renderOrder: number,
  ) {
    const targets: Mesh[] = [];
    root.traverse((obj) => {
      if ((obj as Mesh).isMesh && !this.overlays.includes(obj as Mesh)) targets.push(obj as Mesh);
    });
    for (const mesh of targets) {
      const material = makeMaterial(mesh);
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
      overlay.name = name;
      overlay.renderOrder = renderOrder;
      overlay.frustumCulled = false;
      mesh.add(overlay);
      this.overlays.push(overlay);
    }
  }

  /**
   * 輪郭線（背面法）。法線の向きに少し膨らませた裏面だけを黒で描く。
   * スキニングの前に膨らませるので、アニメーションしても輪郭が付いてくる。
   * 太さはメートルで受け取り、メッシュの拡大率で割ってメッシュの単位にする。
   */
  private outlineMaterial(mesh: Mesh, meters: number): Material {
    mesh.updateWorldMatrix(true, false);
    const scale = mesh.getWorldScale(new Vector3()).x || 1;
    const width = meters / scale;
    const material = this.track(new MeshBasicMaterial({ color: 0x1a1414, side: BackSide }));
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uOutlineWidth = { value: width };
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'uniform float uOutlineWidth;\nvoid main() {')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed += normalize( normal ) * uOutlineWidth;',
        );
    };
    material.customProgramCacheKey = () => 'fbx-viewer-outline';
    return material;
  }

  private toonGradientTexture(): DataTexture {
    if (!this.toonGradient) this.toonGradient = createToonGradient();
    return this.toonGradient;
  }

  private matcapTexture(): DataTexture {
    if (!this.matcap) this.matcap = createClayMatcap();
    return this.matcap;
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

/** トゥーンの陰影の段（影と光の 2 段。アニメ調のくっきりした境目にする）。 */
export function createToonGradient(steps: number[] = [105, 255]): DataTexture {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const tex = new DataTexture(data, steps.length, 1);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** 粘土のような MatCap（左上から光が当たった球）。DOM を使わずに画素を計算する。 */
export function createClayMatcap(size = 128): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const light = normalize3([-0.45, 0.6, 0.66]);
  const base = [218, 196, 178];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1; // DataTexture は下の行から並ぶので、y が増えると上
      const r2 = nx * nx + ny * ny;
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      const diffuse = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
      const rim = Math.pow(1 - nz, 3) * 0.35;
      const spec = Math.pow(Math.max(0, nz * 0.2 + diffuse * 0.8), 40) * 0.35;
      const k = 0.28 + diffuse * 0.72;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.min(255, base[c] * k + 255 * (rim * 0.4 + spec));
      }
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function normalize3(v: number[]): number[] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / l);
}
