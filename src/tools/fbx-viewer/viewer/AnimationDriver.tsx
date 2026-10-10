import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import type { LoadedModel } from '../infra/FbxModelLoader';
import { RestPose } from '../services/restPose';
import { useViewerStore } from '../store/viewerStore';

/** 再生時間をストアに書き込む間隔（秒）。毎フレーム書くと再描画が多すぎる。 */
const REPORT_INTERVAL = 0.1;

/** AnimationMixer でクリップを再生する（設計書 §5.9 再生の制御）。 */
export function AnimationDriver({ model }: { model: LoadedModel }) {
  const invalidate = useThree((s) => s.invalidate);
  const clip = useViewerStore((s) => s.activeClip);
  const playing = useViewerStore((s) => s.playing);
  const loop = useViewerStore((s) => s.loop);
  const speed = useViewerStore((s) => s.speed);
  const seekRequest = useViewerStore((s) => s.seekRequest);
  const bindPoseToken = useViewerStore((s) => s.bindPoseToken);

  const mixer = useMemo(() => new AnimationMixer(model.root), [model]);
  const restPose = useMemo(() => new RestPose(model.root), [model]);
  const actionRef = useRef<AnimationAction | null>(null);
  const sinceReport = useRef(0);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model.root);
      restPose.apply();
    },
    [mixer, model, restPose],
  );

  // クリップが変わったら、姿勢を初期状態に戻してから新しいクリップを設定する
  useEffect(() => {
    mixer.stopAllAction();
    restPose.apply();
    if (!clip) {
      actionRef.current = null;
      invalidate();
      return;
    }
    const action = mixer.clipAction(clip);
    action.clampWhenFinished = true;
    action.play();
    action.paused = !useViewerStore.getState().playing;
    actionRef.current = action;
    mixer.update(0);
    invalidate();
    return () => {
      action.stop();
      mixer.uncacheAction(clip);
      mixer.uncacheClip(clip);
    };
  }, [clip, mixer, restPose, invalidate]);

  useEffect(() => {
    actionRef.current?.setLoop(loop ? LoopRepeat : LoopOnce, Infinity);
  }, [loop, clip]);

  useEffect(() => {
    mixer.timeScale = speed;
  }, [mixer, speed]);

  useEffect(() => {
    const action = actionRef.current;
    if (!action || !clip) return;
    if (playing) {
      // 1 回再生で最後まで行っていたら最初から
      if (!action.enabled || action.time >= clip.duration - 1e-4) {
        action.reset();
      }
      if (!action.isRunning()) action.play();
      action.paused = false;
    } else {
      action.paused = true;
    }
    invalidate();
  }, [playing, clip, invalidate]);

  useEffect(() => {
    const action = actionRef.current;
    if (!seekRequest || !action || !clip) return;
    action.enabled = true;
    action.play(); // バインドポーズ表示などで止めていても、シークした姿勢を出す
    action.paused = !useViewerStore.getState().playing;
    action.time = Math.max(0, Math.min(seekRequest.time, clip.duration));
    mixer.update(0);
    invalidate();
  }, [seekRequest, clip, mixer, invalidate]);

  useEffect(() => {
    if (bindPoseToken === 0) return;
    mixer.stopAllAction();
    restPose.apply();
    useViewerStore.getState().reportTime(0);
    invalidate();
  }, [bindPoseToken, mixer, restPose, invalidate]);

  useFrame((_, delta) => {
    const action = actionRef.current;
    if (!useViewerStore.getState().playing || !action || !clip) return;
    mixer.update(Math.min(delta, 0.1));
    sinceReport.current += delta;
    const finished = !useViewerStore.getState().loop && action.time >= clip.duration - 1e-4;
    if (sinceReport.current >= REPORT_INTERVAL || finished) {
      sinceReport.current = 0;
      useViewerStore.getState().reportTime(action.time);
    }
    if (finished) useViewerStore.getState().setPlaying(false);
  });

  return null;
}
