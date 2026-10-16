import {
  Bone,
  Box,
  Boxes,
  Camera,
  FileBox,
  Image,
  Lightbulb,
  PersonStanding,
  Shapes,
} from 'lucide-react';
import type { SceneNodeKind } from '../../../logic/sceneTree';

/** シーンのノードの種類ごとのアイコン（色も VS Code のファイルアイコンのように変える）。 */
export function NodeIcon({ kind }: { kind: SceneNodeKind }) {
  const p = { size: 14, strokeWidth: 1.8 };
  switch (kind) {
    case 'skinnedMesh':
      return <PersonStanding {...p} className="text-[#b180d7]" />;
    case 'mesh':
      return <Box {...p} className="text-[#75beff]" />;
    case 'bone':
      return <Bone {...p} className="text-[#e2c08d]" />;
    case 'light':
      return <Lightbulb {...p} className="text-[#cca700]" />;
    case 'camera':
      return <Camera {...p} />;
    default:
      return <Boxes {...p} className="text-[#8b8b8b]" />;
  }
}

export const FileIcon = () => <FileBox size={14} strokeWidth={1.8} className="text-[#e37933]" />;
export const ImageIcon = () => <Image size={14} strokeWidth={1.8} className="text-[#a074c4]" />;
export const MaterialIcon = () => <Shapes size={14} strokeWidth={1.8} className="text-[#89d185]" />;
