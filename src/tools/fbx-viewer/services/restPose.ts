import type { Object3D, Quaternion, Vector3 } from 'three';

interface Transform {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
}

/** 読み込み直後のボーンの姿勢を保存し、あとで戻せるようにする（F-5-04 バインドポーズの表示）。 */
export class RestPose {
  private readonly saved = new Map<Object3D, Transform>();

  constructor(root: Object3D) {
    root.traverse((obj) => {
      if ((obj as { isBone?: boolean }).isBone) {
        this.saved.set(obj, {
          position: obj.position.clone(),
          quaternion: obj.quaternion.clone(),
          scale: obj.scale.clone(),
        });
      }
    });
  }

  apply() {
    for (const [obj, t] of this.saved) {
      obj.position.copy(t.position);
      obj.quaternion.copy(t.quaternion);
      obj.scale.copy(t.scale);
    }
  }
}
