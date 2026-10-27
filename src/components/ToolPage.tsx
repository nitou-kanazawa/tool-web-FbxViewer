import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ToolMeta } from '../tools/types';
import { ThemeToggle } from './ThemeToggle';

interface ToolPageProps {
  meta: ToolMeta;
  children: ReactNode;
}

export function ToolPage({ meta, children }: ToolPageProps) {
  if (meta.layout === 'fullscreen') {
    // ツール自身がタイトルバーやツール一覧へのリンクを持つ
    return (
      <div className="h-screen w-screen overflow-hidden bg-white text-slate-900 dark:bg-[#1e1e1e] dark:text-slate-100">
        <h1 className="sr-only">{meta.title}</h1>
        {children}
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div
        className={`mx-auto px-6 py-10 ${meta.layout === 'wide' ? 'max-w-screen-2xl' : 'max-w-3xl'}`}
      >
        <nav className="mb-6 flex items-center justify-between gap-4 text-sm">
          <Link to="/" className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
            ← ツール一覧
          </Link>
          <ThemeToggle />
        </nav>
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{meta.description}</p>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
