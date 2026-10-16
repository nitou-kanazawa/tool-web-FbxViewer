import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { LoadedModel } from '../infra/FbxModelLoader';
import { fileUnitsToMeters } from '../logic/units';
import { DisplayModeManager } from '../services/DisplayModeManager';
import { HELPER_PREFIX } from '../logic/sceneTree';
import { useViewerStore } from '../store/viewerStore';
import { selectNode } from '../ui/workbench/actions';

/** モデルをメートル単位に正規化して表示し、表示モードを適用する（設計書 §5.3, §5.7）。 */
export function ModelView({ model }: { model: LoadedModel }) {
  const invalidate = useThree((s) => s.invalidate);
  const shading = useViewerStore((s) => s.shading);
  const wireframe = useViewerStore((s) => s.wireframe);
  const boneUuid = useViewerStore((s) => s.selectedBoneUuid);
  const textures = useViewerStore((s) => s.textures);
  const manager = useMemo(() => new DisplayModeManager(), []);

  useEffect(() => () => manager.dispose(), [manager]);

  useEffect(() => {
    manager.apply(model.root, { shading, wireframe, boneUuid });
    invalidate();
  }, [manager, model, shading, wireframe, boneUuid, invalidate]);

  // テクスチャの非同期読み込みが終わったら描き直す
  useEffect(() => {
    invalidate();
  }, [textures, invalidate]);

  // クリックしたメッシュを選ぶ（ドラッグで視点を回したときは選ばない）
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 3) return;
    e.stopPropagation();
    let obj = e.object;
    while (obj.name.startsWith(HELPER_PREFIX) && obj.parent) obj = obj.parent;
    selectNode(obj.uuid);
  };

  return (
    <group scale={fileUnitsToMeters(model.unitScaleFactor)}>
      <primitive object={model.root} onClick={onClick} />
    </group>
  );
}
