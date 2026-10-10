import { useState, type DragEvent, type ReactNode } from 'react';
import { useViewerStore } from '../store/viewerStore';
import { filesFromDrop } from './dropFiles';

/** 3D ビュー全体をモデルの受け口にする（F-1-01, 設計書 §5.1）。 */
export function DropZone({ children }: { children: ReactNode }) {
  const openFiles = useViewerStore((s) => s.openFiles);
  const status = useViewerStore((s) => s.status);
  const hasModel = useViewerStore((s) => s.model !== null);
  const [dragging, setDragging] = useState(false);

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = await filesFromDrop(e.dataTransfer);
    if (files.length > 0) void openFiles(files);
  };

  return (
    <div
      aria-label="FBX ファイルのドロップ領域"
      data-testid="drop-zone"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={onDrop}
      className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 dark:border-slate-800"
    >
      {children}
      {!hasModel && status !== 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-300">
          <p className="text-lg font-semibold">ここに FBX をドラッグ＆ドロップ</p>
          <p className="text-sm text-slate-400">
            テクスチャ画像（png / jpg / tga）も一緒にドロップすると割り当てます。
            <br />
            ファイルはブラウザの中だけで処理され、外部には送信されません。
          </p>
        </div>
      )}
      {status === 'loading' && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-slate-100"
        >
          <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          読み込み中…
        </div>
      )}
      {dragging && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-4 border-dashed border-sky-400 bg-sky-500/10 text-lg font-semibold text-sky-100">
          ドロップして読み込む
        </div>
      )}
    </div>
  );
}
