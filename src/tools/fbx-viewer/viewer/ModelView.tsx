import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { LoadedModel } from '../infra/FbxModelLoader';
import { fileUnitsToMeters } from '../logic/units';
import { DisplayModeManager } from '../services/DisplayModeManager';
import { useViewerStore } from '../store/viewerStore';

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

  return (
    <group scale={fileUnitsToMeters(model.unitScaleFactor)}>
      <primitive object={model.root} />
    </group>
  );
}
