/**
 * FBX が参照する外部ファイル（テクスチャ）を、一緒にドロップされたファイルと
 * ファイル名で照合して Blob URL を返す（設計書 §5.2）。
 */

export type ResourceStatus = 'found' | 'embedded' | 'missing' | 'unsupported';

export interface ResolvedResource {
  url: string;
  /** 表示用のファイル名（パスを除いたもの） */
  fileName: string;
  status: ResourceStatus;
}

/** 見つからないテクスチャの代わりに使う 2×2 のマゼンタ画像。 */
export const MISSING_TEXTURE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4z/D/PwgzwBgAaagL9TZTdecAAAAASUVORK5CYII=';

const UNSUPPORTED_EXTENSIONS = new Set(['psd']);

/** Windows のパス・相対パス・URL からファイル名だけを取り出す。 */
export function baseName(path: string): string {
  const withoutQuery = path.split(/[?#]/)[0];
  const parts = withoutQuery.split(/[\\/]/);
  return parts[parts.length - 1] ?? '';
}

export function extensionOf(path: string): string {
  const name = baseName(path);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export interface UrlFactory {
  create(file: Blob): string;
  revoke(url: string): void;
}

const browserUrlFactory: UrlFactory = {
  create: (file) => URL.createObjectURL(file),
  revoke: (url) => URL.revokeObjectURL(url),
};

export class ResourceResolver {
  private readonly files = new Map<string, File>();
  private readonly urls = new Map<string, string>();
  private readonly foreignUrls = new Set<string>();
  private readonly urlFactory: UrlFactory;

  constructor(files: File[], urlFactory: UrlFactory = browserUrlFactory) {
    this.urlFactory = urlFactory;
    for (const f of files) this.files.set(f.name.toLowerCase(), f);
  }

  /** FBX に書かれたパス（または FBXLoader が作った埋め込み画像の URL）を解決する。 */
  resolve(path: string): ResolvedResource {
    if (path.startsWith('blob:') || path.startsWith('data:')) {
      // 埋め込み画像。FBXLoader が作った Blob URL は解放のために覚えておく
      if (path.startsWith('blob:')) this.foreignUrls.add(path);
      return { url: path, fileName: '', status: 'embedded' };
    }
    const fileName = baseName(path);
    if (UNSUPPORTED_EXTENSIONS.has(extensionOf(fileName))) {
      return { url: MISSING_TEXTURE_URL, fileName, status: 'unsupported' };
    }
    const key = fileName.toLowerCase();
    const file = this.files.get(key);
    if (!file) return { url: MISSING_TEXTURE_URL, fileName, status: 'missing' };
    let url = this.urls.get(key);
    if (!url) {
      url = this.urlFactory.create(file);
      this.urls.set(key, url);
    }
    return { url, fileName, status: 'found' };
  }

  dispose() {
    for (const url of this.urls.values()) this.urlFactory.revoke(url);
    for (const url of this.foreignUrls) this.urlFactory.revoke(url);
    this.urls.clear();
    this.foreignUrls.clear();
  }
}
