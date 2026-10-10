import { Grid } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { SkeletonHelper, Vector3, type Mesh, type Object3D } from 'three';
import { useViewerStore } from '../store/viewerStore';

/** グリッド（1 マス 10cm、太線 1m）・スケルトン・選択中のボーンの表示。 */
export function Helpers() {
  const model = useViewerStore((s) => s.model);
  const showGrid = useViewerStore((s) => s.showGrid);
  const showSkeleton = useViewerStore((s) => s.showSkeleton);
  const background = useViewerStore((s) => s.background);
  const light = background === 'light';
  return (
    <>
      {showGrid && (
        <Grid
          infiniteGrid
          cellSize={0.1}
          sectionSize={1}
          fadeDistance={40}
          cellColor={light ? '#cbd5e1' : '#334155'}
          sectionColor={light ? '#94a3b8' : '#64748b'}
        />
      )}
      {model && showSkeleton && <Skeleton root={model.root} />}
      {model && <SelectedBone root={model.root} />}
    </>
  );
}

function Skeleton({ root }: { root: Object3D }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const helper = new SkeletonHelper(root);
    const material = helper.material as { depthTest: boolean; transparent: boolean };
    material.depthTest = false;
    material.transparent = true;
    helper.renderOrder = 10;
    scene.add(helper);
    invalidate();
    return () => {
      scene.remove(helper);
      helper.dispose();
      invalidate();
    };
  }, [root, scene, invalidate]);
  return null;
}

/** リグのパネルで選んだボーンの位置に印を出す。 */
function SelectedBone({ root }: { root: Object3D }) {
  const uuid = useViewerStore((s) => s.selectedBoneUuid);
  const height = useViewerStore((s) => s.analysis?.stats.bounds?.size[1] ?? 1);
  const bone = useMemo(
    () => (uuid ? root.getObjectByProperty('uuid', uuid) : undefined),
    [root, uuid],
  );
  const ref = useRef<Mesh>(null);
  const tmp = useMemo(() => new Vector3(), []);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(() => {
    if (!bone || !ref.current) return;
    bone.getWorldPosition(tmp);
    ref.current.position.copy(tmp);
  });
  useEffect(() => invalidate(), [bone, invalidate]);

  if (!bone) return null;
  return (
    <mesh ref={ref} renderOrder={11}>
      <sphereGeometry args={[Math.max(height * 0.02, 0.005), 16, 12]} />
      <meshBasicMaterial color="#facc15" depthTest={false} transparent />
    </mesh>
  );
}
