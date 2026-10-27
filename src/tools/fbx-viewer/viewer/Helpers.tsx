import { Grid } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Box3Helper,
  Box3,
  CanvasTexture,
  SkeletonHelper,
  SRGBColorSpace,
  Vector3,
  type Mesh,
  type Object3D,
} from 'three';
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
      {model && <GroundShadow />}
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

/**
 * 足元のやわらかい影（接地感を出す）。中心が濃く外に向かって薄くなる円を地面に置く。
 * 毎フレーム影を描き直す方式より軽く、どの環境でも同じように見える。
 */
function GroundShadow() {
  const bounds = useViewerStore((s) => s.analysis?.stats.bounds ?? null);
  const background = useViewerStore((s) => s.background);
  const texture = useMemo(() => createShadowTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  if (!bounds) return null;
  // 横に広がった T ポーズの腕ではなく、足元の広さに合わせる
  const width =
    Math.max(Math.min(bounds.size[0], bounds.size[1] * 0.45), bounds.size[2], 0.05) * 1.6;
  const depth = Math.max(bounds.size[2], width * 0.6) * 1.6;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[
        (bounds.min[0] + bounds.max[0]) / 2,
        bounds.min[1] + 0.001,
        (bounds.min[2] + bounds.max[2]) / 2,
      ]}
      scale={[width, depth, 1]}
      renderOrder={-1}
    >
      <planeGeometry />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        opacity={background === 'light' ? 0.35 : 0.7}
        color="#000000"
      />
    </mesh>
  );
}

function createShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
