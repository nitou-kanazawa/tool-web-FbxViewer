import type { Mesh, Object3D, Texture } from 'three';
import type { FileLike } from '../../infra/FbxModelLoader';
import { nodeKind } from '../../logic/sceneTree';
import { editorId } from '../../logic/workbenchLayout';
import { useViewerStore, type ClipRef } from '../../store/viewerStore';
import { useWorkbenchStore } from '../../store/workbenchStore';
import { ANIMATION_SAMPLES, MODEL_SAMPLES, fetchSampleFiles } from '../samples';

/**
 * 2 つのストア（モデル側と画面側）にまたがる操作をまとめる。
 * 画面部品とコマンドは、ストアを直接いじらずにここを呼ぶ。
 */

const viewer = () => useViewerStore.getState();
const workbench = () => useWorkbenchStore.getState();

/** モデルを開く。差し替わったら、前のモデルを指すタブと選択を消す。 */
export async function openModelFiles(files: File[]) {
  const before = viewer().modelVersion;
  await viewer().openFiles(files);
  if (viewer().modelVersion !== before) workbench().resetForNewModel();
}

export async function openSample(id: string) {
  const sample = MODEL_SAMPLES.find((s) => s.id === id);
  if (!sample) return;
  try {
    await openModelFiles(await fetchSampleFiles(sample.files));
  } catch (e) {
    viewer().log('error', e instanceof Error ? e.message : String(e));
  }
}

export async function addAnimationFiles(files: FileLike[]) {
  await viewer().addAnimations(files);
}

export async function addSampleAnimations() {
  try {
    await addAnimationFiles(await fetchSampleFiles(ANIMATION_SAMPLES));
  } catch (e) {
    viewer().log('error', e instanceof Error ? e.message : String(e));
  }
}

export function findObject(uuid: string): Object3D | undefined {
  return viewer().model?.root.getObjectByProperty('uuid', uuid);
}

/** シーンのノードを選ぶ。ボーンなら、そのボーンのウェイトを表示できるようにする。 */
export function selectNode(uuid: string) {
  const obj = findObject(uuid);
  if (!obj) return;
  workbench().select({ kind: 'node', uuid });
  if (nodeKind(obj) === 'bone') {
    viewer().setView({ selectedBoneUuid: uuid });
  } else if (viewer().selectedBoneUuid) {
    viewer().setView({ selectedBoneUuid: null });
  }
}

export function selectModel() {
  workbench().select({ kind: 'model' });
}

export function openUvEditor(mesh: Mesh) {
  workbench().openEditor({
    id: editorId('uv', mesh.uuid),
    kind: 'uv',
    title: `UV: ${mesh.name || '(名前なし)'}`,
    target: mesh.uuid,
  });
  workbench().select({ kind: 'node', uuid: mesh.uuid });
}

export function openTextureEditor(texture: Texture, title: string) {
  workbench().openEditor({
    id: editorId('texture', texture.uuid),
    kind: 'texture',
    title,
    target: texture.uuid,
  });
  workbench().select({ kind: 'texture', uuid: texture.uuid });
}

export function selectClip(ref: ClipRef) {
  viewer().selectClip(ref);
  workbench().select({ kind: 'clip', ...ref });
}

/** ボーンのウェイト表示を切り替える。ボーンを選んでいなければ、ルートのボーンを選ぶ。 */
export function toggleWeights() {
  const v = viewer();
  if (v.shading === 'boneWeight') {
    v.setView({ shading: 'standard' });
    return;
  }
  if (!v.selectedBoneUuid && v.rig?.rootName) {
    const root = v.model?.root.getObjectByName(v.rig.rootName);
    if (root) selectNode(root.uuid);
  }
  viewer().setView({ shading: 'boneWeight' });
}

/** ワイヤーフレームを なし → 重ねて表示 → ワイヤーのみ → なし の順に切り替える。 */
export function cycleWireframe() {
  const order = ['off', 'overlay', 'only'] as const;
  const current = viewer().wireframe;
  viewer().setView({ wireframe: order[(order.indexOf(current) + 1) % order.length] });
}
