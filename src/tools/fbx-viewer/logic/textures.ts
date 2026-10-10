import type { Material, Object3D, Texture } from 'three';
import { materialsOf } from './modelStats';

/** マテリアルのテクスチャスロット（three.js のプロパティ名）と表示名。 */
export const TEXTURE_SLOTS = [
  { key: 'map', label: 'ベースカラー' },
  { key: 'normalMap', label: '法線' },
  { key: 'bumpMap', label: 'バンプ' },
  { key: 'specularMap', label: 'スペキュラ' },
  { key: 'emissiveMap', label: '発光' },
  { key: 'alphaMap', label: '透明度' },
  { key: 'displacementMap', label: 'ディスプレイスメント' },
  { key: 'aoMap', label: 'AO' },
  { key: 'envMap', label: '反射' },
] as const;

export type TextureSlotKey = (typeof TEXTURE_SLOTS)[number]['key'];

export interface TextureUsage {
  texture: Texture;
  materialName: string;
  slot: TextureSlotKey;
  slotLabel: string;
}

export interface MaterialInfo {
  material: Material;
  name: string;
  type: string;
  meshNames: string[];
  textures: TextureUsage[];
}

/** モデル内のマテリアルと、それぞれに割り当てられたテクスチャを列挙する。 */
export function collectMaterials(root: Object3D): MaterialInfo[] {
  const byId = new Map<string, MaterialInfo>();
  root.traverse((obj) => {
    const mesh = obj as Parameters<typeof materialsOf>[0];
    if (!mesh.isMesh) return;
    for (const m of materialsOf(mesh)) {
      let info = byId.get(m.uuid);
      if (!info) {
        info = {
          material: m,
          name: m.name || '(名前なし)',
          type: m.type,
          meshNames: [],
          textures: slotsOf(m),
        };
        byId.set(m.uuid, info);
      }
      if (!info.meshNames.includes(mesh.name)) info.meshNames.push(mesh.name);
    }
  });
  return [...byId.values()];
}

function slotsOf(material: Material): TextureUsage[] {
  const record = material as unknown as Record<string, unknown>;
  const result: TextureUsage[] = [];
  for (const slot of TEXTURE_SLOTS) {
    const value = record[slot.key] as Texture | null | undefined;
    if (value && value.isTexture) {
      result.push({
        texture: value,
        materialName: material.name || '(名前なし)',
        slot: slot.key,
        slotLabel: slot.label,
      });
    }
  }
  return result;
}

/** テクスチャの画素サイズ。まだ読み込まれていなければ null。 */
export function textureSize(texture: Texture): { width: number; height: number } | null {
  const image = texture.image as { width?: number; height?: number; naturalWidth?: number } | null;
  if (!image) return null;
  const width = image.naturalWidth || image.width || 0;
  const height = (image as { naturalHeight?: number }).naturalHeight || image.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
