import {
  ArrowLeft,
  Monitor,
  Moon,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Search,
  Sun,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../../theme/useTheme';
import type { ThemePreference } from '../../../../theme/theme';
import { useViewerStore } from '../../store/viewerStore';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { IconButton } from './primitives';
import { isMac, withKey } from './platform';
import { vsc } from './styles';
import { formatKeybinding } from '../../logic/keybindings';

const THEME_NEXT: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'システム',
  light: 'ライト',
  dark: 'ダーク',
};
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/** タイトルバー（ツール一覧へのリンク・コマンドの検索・レイアウトの切り替え・テーマ）。 */
export function TitleBar() {
  const fileName = useViewerStore((s) => s.model?.source.fileName ?? null);
  const wb = useWorkbenchStore();
  const { preference, setPreference } = useTheme();

  return (
    <header
      className={`flex h-[35px] shrink-0 items-center gap-2 px-2 text-[12px] ${vsc.title} ${vsc.text}`}
    >
      <Link
        to="/"
        title="ツール一覧に戻る"
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 ${vsc.focus}`}
      >
        <ArrowLeft size={14} />
        ツール一覧
      </Link>
      <span className="hidden truncate sm:inline">
        <span className={vsc.strong}>FBX ビューア</span>
        {fileName && <span className={vsc.muted}> — {fileName}</span>}
      </span>
      <button
        type="button"
        onClick={() => wb.setPaletteOpen(true)}
        title={withKey('コマンド パレット', 'Ctrl+Shift+P')}
        className={`mx-auto flex h-[24px] w-full max-w-[440px] items-center gap-2 rounded-md border px-2 text-[12px] ${vsc.focus} border-[#cecece] bg-[#f3f3f3] hover:bg-white dark:border-[#454545] dark:bg-[#2a2a2a] dark:hover:bg-[#333]`}
      >
        <Search size={13} />
        <span className="truncate">コマンドを検索</span>
        <span className={`ml-auto shrink-0 ${vsc.muted}`}>
          {formatKeybinding('Ctrl+Shift+P', isMac)}
        </span>
      </button>
      <div className="flex items-center gap-0.5">
        <IconButton
          icon={PanelLeft}
          label="サイドバーの表示切り替え"
          keybinding="Ctrl+B"
          active={wb.sidebarVisible}
          onClick={wb.toggleSidebar}
        />
        <IconButton
          icon={PanelBottom}
          label="パネルの表示切り替え"
          keybinding="Ctrl+J"
          active={wb.panelVisible}
          onClick={wb.togglePanel}
        />
        <IconButton
          icon={PanelRight}
          label="インスペクターの表示切り替え"
          keybinding="Ctrl+Alt+B"
          active={wb.inspectorVisible}
          onClick={wb.toggleInspector}
        />
        <IconButton
          icon={THEME_ICON[preference]}
          label={`表示テーマ: ${THEME_LABEL[preference]}（押すと${THEME_LABEL[THEME_NEXT[preference]]}）`}
          onClick={() => setPreference(THEME_NEXT[preference])}
          className="ml-1"
        />
      </div>
    </header>
  );
}
