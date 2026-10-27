import { Bone, Clapperboard, Files, Grid3x3, Image, type LucideIcon } from 'lucide-react';
import type { ViewId } from '../../store/workbenchStore';

export const VIEWS: { id: ViewId; label: string; icon: LucideIcon; keybinding?: string }[] = [
  { id: 'explorer', label: 'エクスプローラー', icon: Files, keybinding: 'Ctrl+Shift+E' },
  { id: 'textures', label: 'テクスチャ', icon: Image },
  { id: 'uv', label: 'UV', icon: Grid3x3 },
  { id: 'rig', label: 'リグ', icon: Bone },
  { id: 'animation', label: 'アニメーション', icon: Clapperboard },
];
