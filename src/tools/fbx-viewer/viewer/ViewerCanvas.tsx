import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useViewerStore, type Background } from '../store/viewerStore';
import { AnimationDriver } from './AnimationDriver';
import { CameraRig } from './CameraRig';
import { Helpers } from './Helpers';
import { ModelView } from './ModelView';

const BACKGROUND_COLORS: Record<Background, string> = {
  dark: '#0f172a',
  gray: '#64748b',
  light: '#f1f5f9',
};

export function ViewerCanvas() {
  const model = useViewerStore((s) => s.model);
  const playing = useViewerStore((s) => s.playing);
  const background = useViewerStore((s) => s.background);
  const showAxes = useViewerStore((s) => s.showAxes);

  return (
    <Canvas
      // 再生中以外は操作があったときだけ描画する（設計書 §5.8）
      frameloop={playing ? 'always' : 'demand'}
      camera={{ fov: 45, near: 0.01, far: 1000, position: [2, 1.5, 3] }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="3D ビュー"
      data-testid="viewer-canvas"
    >
      <color attach="background" args={[BACKGROUND_COLORS[background]]} />
      <hemisphereLight args={['#ffffff', '#64748b', 1.6]} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} />
      {model && <ModelView model={model} />}
      {model && <AnimationDriver model={model} />}
      <Helpers />
      <CameraRig />
      <OrbitControls makeDefault enableDamping={false} />
      {showAxes && (
        <GizmoHelper alignment="bottom-right" margin={[56, 56]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.9} />
        </GizmoHelper>
      )}
    </Canvas>
  );
}
