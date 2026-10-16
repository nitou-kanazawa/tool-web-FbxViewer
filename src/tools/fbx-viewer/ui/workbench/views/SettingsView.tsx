import { useTheme } from '../../../../../theme/useTheme';
import type { ThemePreference } from '../../../../../theme/theme';
import { formatNumber } from '../../../logic/format';
import { PRESETS, findPreset } from '../../../logic/inspection/presets';
import { useViewerStore, type Background } from '../../../store/viewerStore';
import { buildCommands } from '../commands';
import { KeyHint, PropertyGrid, Section, VsCheckbox, VsSelect } from '../primitives';
import { vsc } from '../styles';

const shortcutList = buildCommands().filter((c) => c.keybindings?.length);

export function SettingsView() {
  const presetId = useViewerStore((s) => s.presetId);
  const setPreset = useViewerStore((s) => s.setPreset);
  const s = useViewerStore();
  const { preference, setPreference } = useTheme();
  const preset = findPreset(presetId);

  return (
    <>
      <Section title="検品プリセット">
        <div className="px-3 py-1">
          <VsSelect
            label="検品プリセット"
            hideLabel={false}
            value={presetId}
            onChange={setPreset}
            options={PRESETS.map((p) => ({ value: p.id, label: p.name }))}
            testId="preset-select"
          />
        </div>
        <PropertyGrid
          rows={[
            ['三角形の上限', formatNumber(preset.maxTriangles)],
            ['マテリアルの上限', String(preset.maxMaterials)],
            ['テクスチャの上限', `${preset.maxTextureSize} px`],
            ['ボーンの上限', preset.maxBones === null ? 'チェックしない' : String(preset.maxBones)],
            ['高さの範囲', `${preset.heightRangeMeters[0]}〜${preset.heightRangeMeters[1]} m`],
            ['警告を出す割合', `${Math.round(preset.warnRatio * 100)}%`],
          ]}
        />
      </Section>
      <Section title="3D ビュー">
        <div className="flex flex-col gap-1.5 px-3 py-1">
          <VsSelect
            label="背景"
            hideLabel={false}
            value={s.background}
            onChange={(v) => s.setView({ background: v as Background })}
            options={[
              { value: 'dark', label: '暗' },
              { value: 'gray', label: '中' },
              { value: 'light', label: '明' },
            ]}
          />
          <VsCheckbox
            label="グリッド（1 マス 10cm）"
            checked={s.showGrid}
            onChange={(v) => s.setView({ showGrid: v })}
          />
          <VsCheckbox
            label="座標軸"
            checked={s.showAxes}
            onChange={(v) => s.setView({ showAxes: v })}
          />
        </div>
      </Section>
      <Section title="テーマ">
        <div className="px-3 py-1">
          <VsSelect
            label="表示テーマ"
            hideLabel={false}
            value={preference}
            onChange={(v) => setPreference(v as ThemePreference)}
            options={[
              { value: 'system', label: 'システムに合わせる' },
              { value: 'light', label: 'ライト' },
              { value: 'dark', label: 'ダーク' },
            ]}
          />
        </div>
      </Section>
      <Section title="キーボード ショートカット">
        <div className="px-3">
          {shortcutList.map((c) => (
            <div
              key={c.id}
              className="flex min-h-[22px] items-center justify-between gap-2 text-[12px]"
            >
              <span className={`truncate ${vsc.text}`}>{c.title}</span>
              <span className="flex gap-1">
                {c.keybindings!.map((k) => (
                  <KeyHint key={k} keybinding={k} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
