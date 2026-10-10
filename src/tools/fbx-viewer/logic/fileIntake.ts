export interface IntakeResult {
  models: File[];
  images: File[];
  ignored: File[];
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tga', 'psd', 'bmp', 'webp'];

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** ドロップされたファイルを拡張子で振り分ける（設計書 §5.1）。 */
export function classifyFiles(files: File[]): IntakeResult {
  const result: IntakeResult = { models: [], images: [], ignored: [] };
  for (const file of files) {
    const ext = extension(file.name);
    if (ext === 'fbx') result.models.push(file);
    else if (IMAGE_EXTENSIONS.includes(ext)) result.images.push(file);
    else result.ignored.push(file);
  }
  return result;
}
