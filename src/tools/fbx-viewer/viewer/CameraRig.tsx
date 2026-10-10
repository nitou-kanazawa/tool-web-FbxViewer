import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { computeFitCamera } from '../logic/cameraFit';
import { useViewerStore } from '../store/viewerStore';

interface Controls {
  target: { set(x: number, y: number, z: number): void };
  update(): void;
}

/**
 * カメラ合わせ（F-1-11）。最初のモデルを読み込んだときとリセットボタンのときだけ合わせ、
 * モデルを差し替えてもカメラ位置は保持する。
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const bounds = useViewerStore((s) => s.analysis?.stats.bounds ?? null);
  const modelVersion = useViewerStore((s) => s.modelVersion);
  const resetToken = useViewerStore((s) => s.cameraResetToken);
  const fittedFor = useRef<{ model: number; reset: number } | null>(null);

  useEffect(() => {
    if (!controls || modelVersion === 0) return;
    const prev = fittedFor.current;
    const firstModel = prev === null;
    const resetPressed = prev !== null && prev.reset !== resetToken;
    if (!firstModel && !resetPressed) {
      fittedFor.current = { model: modelVersion, reset: resetToken };
      return;
    }
    const fit = computeFitCamera(bounds, camera.fov, size.width / Math.max(size.height, 1));
    camera.position.set(...fit.position);
    camera.near = fit.near;
    camera.far = fit.far;
    camera.updateProjectionMatrix();
    controls.target.set(...fit.target);
    controls.update();
    fittedFor.current = { model: modelVersion, reset: resetToken };
    invalidate();
  }, [controls, camera, bounds, modelVersion, resetToken, size, invalidate]);

  return null;
}
