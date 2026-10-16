import type { ComponentType } from 'react';

/**
 * 各ツールが公開するメタ情報。
 * `src/tools/<name>/tool.tsx` で `meta` という名前で export する。
 */
export interface ToolMeta {
  /** URL スラッグ。フォルダ名と一致させること（例: "word-counter"）。 */
  slug: string;
  /** 一覧やページ見出しに表示する名前。 */
  title: string;
  /** ツールの説明（1〜2文）。一覧カードに表示される。 */
  description: string;
  /** 任意。一覧での絞り込み・分類用。 */
  tags?: string[];
  /**
   * 任意。ツールページの配置。既定は 'default'。
   * - 'wide': 最大幅の制限を外す
   * - 'fullscreen': 見出しやリンクを出さず、画面いっぱいをツールに渡す（アプリ風の UI 用）
   */
  layout?: 'default' | 'wide' | 'fullscreen';
}

/** レジストリに登録されるツール1件。 */
export interface RegisteredTool {
  meta: ToolMeta;
  Component: ComponentType;
}
