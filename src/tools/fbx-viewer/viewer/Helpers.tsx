import { Grid } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3Helper, Box3, SkeletonHelper, Vector3, type Mesh, type Object3D } from 'three';
import { useWorkbenchStore } from '../store/workbenchStore';
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
          cellColor={light ? '#c8c8c8' : '#3a3a3a'}
          sectionColor={light ? '#9a9a9a' : '#5e5e5e'}
        />
      )}
      {model && showSkeleton && <Skeleton root={model.root} />}
      {model && <SelectedBone root={model.root} />}
      {model && <SelectionBox root={model.root} />}
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

/** 選んだメッシュやグループを枠で囲む（VS Code の選択色）。再生中は枠も動きに合わせる。 */
function SelectionBox({ root }: { root: Object3D }) {
  const selection = useWorkbenchStore((s) => s.selection);
  const playing = useViewerStore((s) => s.playing);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const target = useMemo(() => {
    if (selection.kind !== 'node') return undefined;
    const obj = root.getObjectByProperty('uuid', selection.uuid);
    return obj && !(obj as { isBone?: boolean }).isBone ? obj : undefined;
  }, [root, selection]);
  const box = useMemo(() => new Box3(), []);
  const helper = useMemo(() => {
    const h = new Box3Helper(box, 0x007fd4);
    (h.material as { depthTest: boolean }).depthTest = false;
    h.renderOrder = 12;
    return h;
  }, [box]);

  useEffect(() => {
    if (!target) return;
    box.setFromObject(target);
    scene.add(helper);
    invalidate();
    return () => {
      scene.remove(helper);
      invalidate();
    };
  }, [target, box, helper, scene, invalidate]);

  useEffect(() => () => helper.dispose(), [helper]);

  useFrame(() => {
    // スキンメッシュの枠の計算は重いので、再生中だけ毎フレーム更新する
    if (target && playing) box.setFromObject(target);
  });

  return null;
}
