import { FbxViewerError } from '../errors';
import { loadFbxModel, type LoadedModel } from '../infra/FbxModelLoader';
import { classifyFiles } from '../logic/fileIntake';

export interface OpenResult {
  model: LoadedModel;
  /** 利用者に知らせること（無視したファイルなど） */
  notices: string[];
}

/**
 * 表示中のモデルのライフサイクルを管理する（設計書 §5.4）。
 * - 新しいモデルの読み込みに成功してから、古いモデルを破棄する
 * - 読み込み中に次のドロップがあれば、古い読み込みの結果は捨てる
 */
export class ModelSession {
  private current: LoadedModel | null = null;
  private sequence = 0;

  get model(): LoadedModel | null {
    return this.current;
  }

  /** 読み込みが後から来た別の読み込みに追い越されたら null を返す。 */
  async open(files: File[]): Promise<OpenResult | null> {
    const seq = ++this.sequence;
    const { models, images, ignored } = classifyFiles(files);
    if (models.length === 0) throw new FbxViewerError('NO_MODEL_FILE');
    const notices: string[] = [];
    if (models.length > 1) {
      notices.push(
        `FBX が ${models.length} 個ありました。最初の「${models[0].name}」だけを読み込みました（アニメはアニメバーから追加してください）。`,
      );
    }
    if (ignored.length > 0) {
      notices.push(
        `対応していないファイルを無視しました: ${ignored.map((f) => f.name).join(', ')}`,
      );
    }

    await waitFrames(2); // ローディング表示を描画してから、同期処理の解析を始める
    const model = await loadFbxModel(models[0], images);
    if (seq !== this.sequence) {
      model.dispose();
      return null;
    }
    this.current?.dispose();
    this.current = model;
    return { model, notices };
  }

  dispose() {
    this.sequence++;
    this.current?.dispose();
    this.current = null;
  }
}

function waitFrames(count: number): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve();
  return new Promise((resolve) => {
    const step = (n: number) => (n <= 0 ? resolve() : requestAnimationFrame(() => step(n - 1)));
    step(count);
  });
}
