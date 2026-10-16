import { FolderOpen, Play } from 'lucide-react';
import { formatBytes } from '../../../logic/format';
import { useViewerStore } from '../../../store/viewerStore';
import { useWorkbenchStore } from '../../../store/workbenchStore';
import { MODEL_SAMPLES } from '../../samples';
import { openSample, selectModel } from '../actions';
import { openFileDialog } from '../fileDialogs';
import { Empty, IconButton, KeyHint, Row, Section } from '../primitives';
import { vsc } from '../styles';
import { FileIcon, ImageIcon } from './icons';
import { SceneTreeView } from './SceneTreeView';

export function ExplorerView() {
  const model = useViewerStore((s) => s.model);
  const selection = useWorkbenchStore((s) => s.selection);

  return (
    <>
      <Section
        title="開いているファイル"
        actions={
          <IconButton
            icon={FolderOpen}
            label="ファイルを開く"
            keybinding="Ctrl+O"
            onClick={() => openFileDialog('model')}
          />
        }
      >
        {model ? (
          <>
            <Row
              icon={<FileIcon />}
              label={model.source.fileName}
              description={formatBytes(model.source.fileSize)}
              selected={selection.kind === 'model'}
              onClick={selectModel}
              testId="explorer-file"
            />
            {model.textureSources
              .filter((t) => t.status === 'found')
              .map((t) => (
                <Row
                  key={t.texture.uuid}
                  depth={1}
                  icon={<ImageIcon />}
                  label={t.fileName}
                  description="テクスチャ"
                />
              ))}
          </>
        ) : (
          <Empty>
            <p>まだファイルを開いていません。</p>
            <button
              type="button"
              className={`mt-2 w-full ${vsc.button}`}
              onClick={() => openFileDialog('model')}
            >
              ファイルを開く
            </button>
            <p className="mt-2">
              FBX とテクスチャ画像を、画面のどこにでもドラッグ＆ドロップできます（
              <KeyHint keybinding="Ctrl+O" /> でも開けます）。
            </p>
          </Empty>
        )}
      </Section>
      {model && (
        <Section title="シーン" testId="scene-section">
          <SceneTreeView root={model.root} testId="scene-tree" />
        </Section>
      )}
      <Section title="サンプル" defaultOpen={!model}>
        {MODEL_SAMPLES.map((s) => (
          <Row
            key={s.id}
            icon={<Play size={12} className={vsc.muted} />}
            label={s.label}
            onClick={() => void openSample(s.id)}
            title={`${s.files.join(' + ')} を開く`}
            testId={`sample-${s.id}`}
          />
        ))}
      </Section>
    </>
  );
}
