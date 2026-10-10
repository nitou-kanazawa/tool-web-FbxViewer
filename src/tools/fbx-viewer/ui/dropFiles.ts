/** ドロップされたファイルを集める。フォルダがドロップされたら中のファイルも集める（F-1-07）。 */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items ?? [])
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (entries.length === 0 || entries.every((e) => e.isFile)) return Array.from(dt.files);
  const files: File[] = [];
  for (const entry of entries) files.push(...(await readEntry(entry)));
  return files;
}

async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return [
      await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      ),
    ];
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children: FileSystemEntry[] = [];
  // readEntries は 1 回で全件を返さないことがあるので、空になるまで読む
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) break;
    children.push(...batch);
  }
  const nested = await Promise.all(children.map(readEntry));
  return nested.flat();
}
