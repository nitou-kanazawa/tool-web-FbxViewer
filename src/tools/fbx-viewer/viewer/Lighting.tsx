import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LIGHTING, keyLightPosition } from '../logic/lighting';
import { useViewerStore } from '../store/viewerStore';

/**
 * ライティングのプリセットとライトの向きに従って光を置く（F-1-16）。
 * 平行光源なので、位置は向きだけを表す（大きさの違うモデルでも同じに見える）。
 */
export function SceneLights() {
  const preset = LIGHTING[useViewerStore((s) => s.lighting)];
  const angle = useViewerStore((s) => s.lightAngle);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [preset, angle, invalidate]);

  return (
    <>
      <hemisphereLight args={[preset.hemi.sky, preset.hemi.ground, preset.hemi.intensity]} />
      {preset.key.intensity > 0 && (
        <directionalLight
          position={keyLightPosition(angle, preset.key.elevationDeg)}
          color={preset.key.color}
          intensity={preset.key.intensity}
        />
      )}
      {preset.fill && (
        <directionalLight
          position={keyLightPosition(angle + 180, 20)}
          color={preset.fill.color}
          intensity={preset.fill.intensity}
        />
      )}
      <SceneEnvironment intensity={preset.environment} />
    </>
  );
}

/**
 * PBR（MeshStandardMaterial）用の映り込み。three.js 付属の、その場で作る部屋の環境マップを使う
 * （外部の画像を読み込まない）。Phong やトゥーンには影響しない。
 */
function SceneEnvironment({ intensity }: { intensity: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const texture = pmrem.fromScene(room, 0.04).texture;
    scene.environment = texture;
    invalidate();
    return () => {
      scene.environment = null;
      texture.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, invalidate]);

  useEffect(() => {
    scene.environmentIntensity = intensity;
    invalidate();
  }, [scene, intensity, invalidate]);

  return null;
}
