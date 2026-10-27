import { SHADING_GROUPS, SHADING_LABELS } from '../../services/DisplayModeManager';

/** シェーディングのプルダウンの選択肢（「見た目」「確認用」のグループに分ける）。 */
export function shadingOptions() {
  return SHADING_GROUPS.flatMap((g) =>
    g.modes.map((mode) => ({ value: mode, label: SHADING_LABELS[mode], group: g.label })),
  );
}
