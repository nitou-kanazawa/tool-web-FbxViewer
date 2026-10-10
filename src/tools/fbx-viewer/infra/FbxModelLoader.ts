import {
  Loader,
  LoadingManager,
  TextureLoader,
  type Group,
  type LoadingManager as LoadingManagerType,
  type Material,
  type Mesh,
  type Texture,
} from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { FbxViewerError } from '../errors';
import { readFbxHeader, type FbxHeader } from './fbxHeader';
import { collectWarnings, type LoaderDiagnostic } from './LoaderDiagnostics';
import { ResourceResolver, extensionOf, type ResourceStatus } from './ResourceResolver';

/** 読み込んだテクスチャ 1 枚の出どころ。 */
export interface TextureSource {
  texture: Texture;
  /** FBX に書かれていたパス（埋め込みなら空） */
  sourcePath: string;
  fileName: string;
  status: ResourceStatus;
}

export interface LoadedModel {
  root: Group;
  source: { fileName: string; fileSize: number } & FbxHeader;
  /** 1 単位が何 cm か。記録がなければ 1（= cm） */
  unitScaleFactor: number;
  diagnostics: LoaderDiagnostic[];
  textureSources: TextureSource[];
  /** テクスチャの非同期読み込みがすべて終わったら解決する */
  texturesReady: Promise<void>;
  dispose(): void;
}

/** File と同じ形のもの（テストでは Node の Buffer から作れるようにする）。 */
export interface FileLike {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * FBXLoader が拡張子ごとに使うローダー。どのテクスチャがどのファイルから来たかを記録し、
 * 外部ファイルは ResourceResolver で解決する。
 */
class TrackingTextureLoader extends Loader<Texture> {
  private readonly resolver: ResourceResolver;
  private readonly records: TextureSource[];
  private readonly textureLoader: TextureLoader;
  private readonly tgaLoader: TGALoader;

  constructor(manager: LoadingManagerType, resolver: ResourceResolver, records: TextureSource[]) {
    super(manager);
    this.resolver = resolver;
    this.records = records;
    this.textureLoader = new TextureLoader(manager);
    this.tgaLoader = new TGALoader(manager);
  }

  override load(url: string): Texture {
    // FBXLoader は setPath でパスを設定してくるが、ファイル名だけで照合するので使わない
    const resolved = this.resolver.resolve(url);
    const isTga =
      resolved.status !== 'missing' &&
      resolved.status !== 'unsupported' &&
      (extensionOf(url) === 'tga' || resolved.fileName.toLowerCase().endsWith('.tga'));
    const texture = isTga
      ? this.tgaLoader.load(resolved.url)
      : this.textureLoader.load(resolved.url);
    this.records.push({
      texture,
      sourcePath: resolved.status === 'embedded' ? '' : url,
      fileName: resolved.fileName,
      status: resolved.status,
    });
    return texture;
  }
}

export async function loadFbxModel(file: FileLike, images: File[] = []): Promise<LoadedModel> {
  const buffer = await file.arrayBuffer();
  const header = readFbxHeader(buffer);

  const resolver = new ResourceResolver(images);
  const manager = new LoadingManager();
  const textureSources: TextureSource[] = [];
  // FBXLoader は「.拡張子」でハンドラを探すので、すべての拡張子をこのローダーで受ける
  manager.addHandler(/^\.[^./\\]+$/, new TrackingTextureLoader(manager, resolver, textureSources));

  let pending = 0;
  let settle: () => void = () => {};
  const texturesReady = new Promise<void>((resolve) => {
    settle = resolve;
  });
  manager.onStart = () => {
    pending++;
  };
  manager.onLoad = () => settle();

  let parsed: { result: Group; diagnostics: LoaderDiagnostic[] };
  try {
    parsed = collectWarnings(() => new FBXLoader(manager).parse(buffer, ''));
  } catch (e) {
    resolver.dispose();
    if (e instanceof FbxViewerError) throw e;
    throw new FbxViewerError('PARSE_FAILED', e instanceof Error ? e.message : String(e));
  }
  if (pending === 0 && textureSources.length === 0) settle();

  const root = parsed.result;
  const unitScaleFactor = Number(root.userData.unitScaleFactor);

  return {
    root,
    source: { fileName: file.name, fileSize: file.size, ...header },
    unitScaleFactor: Number.isFinite(unitScaleFactor) && unitScaleFactor > 0 ? unitScaleFactor : 1,
    diagnostics: parsed.diagnostics,
    textureSources,
    texturesReady,
    dispose() {
      disposeObject(root);
      for (const t of textureSources) t.texture.dispose();
      resolver.dispose();
    },
  };
}

/** ジオメトリ・マテリアル・テクスチャを解放する。 */
export function disposeObject(root: Group) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of materials) {
      if (!m) continue;
      for (const value of Object.values(m)) {
        if (value && typeof value === 'object' && (value as Texture).isTexture) {
          (value as Texture).dispose();
        }
      }
      m.dispose();
    }
    if ('skeleton' in mesh && mesh.skeleton) {
      (mesh.skeleton as { dispose(): void }).dispose();
    }
  });
}
