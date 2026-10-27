import { Clapperboard, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { availableAssets, useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { filesFromDrop } from '../../dropFiles';
import { addAnimationFiles, addSampleAnimations, selectClip } from '../actions';
import { openFileDialog } from '../fileDialogs';
import { Empty, IconButton, Row, Section } from '../primitives';
import { vsc } from '../styles';

/** アニメのクリップ一覧（モデル内蔵 + ライブラリ）。アニメ FBX のドロップも受け付ける。 */
export function AnimationView() {
  const model = useViewerStore((s) => s.model);
  const library = useViewerStore((s) => s.library);
  const persistent = useViewerStore((s) => s.libraryPersistent);
  const busy = useViewerStore((s) => s.libraryBusy);
  const selectedClip = useViewerStore((s) => s.selectedClip);
  const removeAnimation = useViewerStore((s) => s.removeAnimation);
  const select = useWorkbenchStore((s) => s.select);
  const [dragging, setDragging] = useState(false);
  const assets = availableAssets({ model, library });
  const embedded = assets.filter((a) => a.origin === 'embedded');

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = await filesFromDrop(e.dataTransfer);
    if (files.length) await addAnimationFiles(files);
  };

  const clipRows = (a: (typeof assets)[number], removable: boolean) =>
    a.clips.map((c, i) => {
      const active = selectedClip?.assetId === a.id && selectedClip.clipIndex === i;
      return (
        <Row
          key={`${a.id}-${i}`}
          icon={<Clapperboard size={14} className="text-[#3794ff]" />}
          label={c.name || `クリップ ${i + 1}`}
          description={`${a.name} · ${c.duration.toFixed(2)}s`}
          selected={active}
          onClick={() => selectClip({ assetId: a.id, clipIndex: i })}
          trailing={
            removable && i === 0 ? (
              <IconButton
                icon={Trash2}
                size={14}
                label={`${a.name} をライブラリから削除`}
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  void removeAnimation(a.id);
                  select({ kind: 'model' });
                }}
              />
            ) : undefined
          }
          testId="clip-item"
        />
      );
    });

  return (
    <div
      className={`min-h-full ${dragging ? 'outline outline-2 -outline-offset-2 outline-[#007fd4]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="animation-view"
    >
      {model && embedded.length > 0 && (
        <Section title="モデル内蔵">{embedded.flatMap((a) => clipRows(a, false))}</Section>
      )}
      <Section
        title={`ライブラリ (${library.length})`}
        actions={
          <>
            <IconButton
              icon={Plus}
              label="アニメ FBX を追加"
              onClick={() => openFileDialog('animation')}
            />
            <IconButton
              icon={FolderOpen}
              label="サンプルアニメを追加"
              onClick={() => void addSampleAnimations()}
            />
          </>
        }
      >
        {library.flatMap((a) => clipRows(a, true))}
        <Empty>
          {library.length === 0 && (
            <p className="mb-2">
              Mixamo などのアニメ FBX を、ここにドラッグ＆ドロップして追加できます。
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className={vsc.button}
              disabled={busy}
              onClick={() => openFileDialog('animation')}
            >
              アニメ FBX を追加
            </button>
            <button
              type="button"
              className={vsc.buttonSecondary}
              disabled={busy}
              onClick={() => void addSampleAnimations()}
            >
              サンプルアニメを追加
            </button>
          </div>
          <p className="mt-2">
            {persistent
              ? '追加したアニメはこのブラウザの中（IndexedDB）に保存され、次回も使えます。外部には送信されません。'
              : 'このブラウザでは保存できないため、ページを閉じると消えます。'}
          </p>
          {busy && <p className="mt-1">読み込み中…</p>}
        </Empty>
      </Section>
    </div>
  );
}
