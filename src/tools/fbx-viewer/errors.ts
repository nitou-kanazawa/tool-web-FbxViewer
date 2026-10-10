/** FBX ビューアで扱うエラーの種類。 */
export type FbxViewerErrorCode =
  'NO_MODEL_FILE' | 'NOT_FBX' | 'UNSUPPORTED_VERSION' | 'PARSE_FAILED' | 'ANIM_NO_CLIPS';

export class FbxViewerError extends Error {
  readonly code: FbxViewerErrorCode;
  readonly detail?: string;

  constructor(code: FbxViewerErrorCode, detail?: string) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.name = 'FbxViewerError';
    this.code = code;
    this.detail = detail;
  }
}

/** エラーを画面に出す日本語メッセージに変換する。 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof FbxViewerError) {
    switch (error.code) {
      case 'NO_MODEL_FILE':
        return 'FBX ファイルが含まれていません。';
      case 'NOT_FBX':
        return 'FBX ファイルとして読み込めませんでした。';
      case 'UNSUPPORTED_VERSION':
        return `FBX ${formatFbxVersion(Number(error.detail))} は未対応です。FBX 7.0 以上で書き出してください。`;
      case 'PARSE_FAILED':
        return `ファイルの解析に失敗しました（詳細: ${error.detail ?? '不明'}）`;
      case 'ANIM_NO_CLIPS':
        return 'このファイルにはアニメーションが含まれていません。';
    }
  }
  return `予期しないエラーが発生しました（${error instanceof Error ? error.message : String(error)}）`;
}

/** 7400 → "7.4" */
export function formatFbxVersion(version: number): string {
  if (!Number.isFinite(version)) return '不明';
  return `${Math.floor(version / 1000)}.${Math.floor((version % 1000) / 100)}`;
}
