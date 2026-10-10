/** public/samples/ にある自作のサンプル（scripts/fixtures/generate-samples.ts で生成）。 */
export const MODEL_SAMPLES = [
  { id: 'character', label: 'キャラクター（リグ・アニメ付き）', files: ['sample-character.fbx'] },
  { id: 'cube', label: 'キューブ（検品で警告が出る例）', files: ['cube.fbx'] },
  {
    id: 'cube-texture',
    label: 'キューブ + テクスチャ',
    files: ['cube.fbx', 'cube_basecolor.png'],
  },
] as const;

export const ANIMATION_SAMPLES = ['anim-wave.fbx', 'anim-walk.fbx'] as const;

/** サンプルを取得して File にする。 */
export async function fetchSampleFiles(names: ReadonlyArray<string>): Promise<File[]> {
  return Promise.all(
    names.map(async (name) => {
      const res = await fetch(`samples/${name}`);
      if (!res.ok) throw new Error(`サンプル ${name} を取得できませんでした（${res.status}）`);
      return new File([await res.blob()], name);
    }),
  );
}
