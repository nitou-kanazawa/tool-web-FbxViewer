import { Component, lazy, Suspense, type ReactNode } from 'react';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'fbx-viewer',
  title: 'FBX ビューア',
  description:
    'FBX をドラッグ＆ドロップして、メッシュ・テクスチャ・UV・リグ・アニメーションを確認し、ゲーム用アセットとして検品します。',
  tags: ['3d', 'fbx', 'unity'],
  layout: 'fullscreen',
};

// three.js 一式はこのツールを開いたときに初めて読み込む（NF-05）
const FbxViewerApp = lazy(() => import('./FbxViewerApp'));

export default function FbxViewer() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <p
            aria-busy="true"
            className="flex h-screen items-center justify-center text-[13px] text-slate-500"
          >
            ビューアを読み込んでいます…
          </p>
        }
      >
        <FbxViewerApp />
      </Suspense>
    </ErrorBoundary>
  );
}

/** 予期しない例外でツールのページ全体が消えないようにする。 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <p className="font-semibold">
            ビューアでエラーが発生しました。ページを再読み込みしてください。
          </p>
          <p className="mt-2 text-sm opacity-80">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
