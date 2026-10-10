import { formatFbxVersion } from '../../errors';
import { formatBytes, formatMeters, formatNumber } from '../../logic/format';
import { findPreset } from '../../logic/inspection/presets';
import { summarize } from '../../logic/inspection/runInspection';
import { inspectionToMarkdown } from '../../logic/report';
import { describeUnit } from '../../logic/units';
import { useViewerStore } from '../../store/viewerStore';
import { useState } from 'react';
import { Button, EmptyState, LevelBadge, Section } from '../common/controls';

export function OverviewPanel() {
  const model = useViewerStore((s) => s.model);
  const analysis = useViewerStore((s) => s.analysis);
  const inspection = useViewerStore((s) => s.inspection);
  const presetId = useViewerStore((s) => s.presetId);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  if (!model || !analysis) {
    return (
      <div className="space-y-4">
        <EmptyState>
          FBX を読み込むと、統計と検品結果がここに表示されます。上の「サンプルを開く」から試せます。
        </EmptyState>
        <Tips />
      </div>
    );
  }
  const { stats } = analysis;
  const copyReport = async () => {
    const md = inspectionToMarkdown({
      fileName: model.source.fileName,
      presetName: findPreset(presetId).name,
      stats,
      results: inspection,
    });
    try {
      await navigator.clipboard.writeText(md);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2000);
  };
  const sum = summarize(inspection);
  const tiles: { id: string; label: string; value: string }[] = [
    {
      id: 'triangles',
      label: 'ポリゴン（三角形）',
      value: formatNumber(stats.totals.triangleCount),
    },
    { id: 'vertices', label: '頂点', value: formatNumber(stats.totals.vertexCount) },
    { id: 'meshes', label: 'メッシュ', value: formatNumber(stats.totals.meshCount) },
    { id: 'materials', label: 'マテリアル', value: formatNumber(stats.totals.materialCount) },
    { id: 'textures', label: 'テクスチャ', value: formatNumber(stats.totals.textureCount) },
    { id: 'bones', label: 'ボーン', value: formatNumber(stats.totals.boneCount) },
    { id: 'clips', label: 'アニメ', value: formatNumber(stats.totals.clipCount) },
    { id: 'morphs', label: 'ブレンドシェイプ', value: formatNumber(stats.totals.morphTargetCount) },
  ];

  return (
    <div className="space-y-6">
      <Section title="ファイル">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">名前</dt>
          <dd className="break-all" data-testid="file-name">
            {model.source.fileName}
          </dd>
          <dt className="text-slate-500">サイズ</dt>
          <dd>{formatBytes(model.source.fileSize)}</dd>
          <dt className="text-slate-500">形式</dt>
          <dd>
            FBX {formatFbxVersion(model.source.version)}（
            {model.source.format === 'binary' ? 'バイナリ' : 'ASCII'}）
          </dd>
          <dt className="text-slate-500">単位</dt>
          <dd>
            1 単位 = {describeUnit(model.unitScaleFactor)}（UnitScaleFactor {model.unitScaleFactor}
            ）
          </dd>
          <dt className="text-slate-500">上方向</dt>
          <dd>{stats.upAxis === 'Z' ? 'Z-up（表示用に補正済み）' : 'Y-up'}</dd>
          {stats.bounds && (
            <>
              <dt className="text-slate-500">大きさ</dt>
              <dd data-testid="model-size">
                幅 {formatMeters(stats.bounds.size[0])} × 高さ {formatMeters(stats.bounds.size[1])}{' '}
                × 奥行き {formatMeters(stats.bounds.size[2])}
              </dd>
            </>
          )}
        </dl>
      </Section>

      <Section
        title="検品結果"
        right={
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-500" data-testid="inspection-summary">
              NG {sum.ng} ／ 警告 {sum.warn} ／ OK {sum.ok}
            </span>
            <Button onClick={copyReport} className="!px-2 !py-1 text-xs">
              {copied === 'done'
                ? 'コピーしました'
                : copied === 'failed'
                  ? 'コピーできませんでした'
                  : 'Markdown でコピー'}
            </Button>
          </span>
        }
      >
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {inspection.map((r) => (
            <li
              key={r.id}
              data-testid={`inspection-${r.id}`}
              data-level={r.level}
              className="px-3 py-2 text-sm"
            >
              <div className="flex items-start gap-2">
                <LevelBadge level={r.level} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <span className="mr-1 text-xs text-slate-400">{r.id}</span>
                    {r.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">{r.message}</p>
                  {r.targets && r.targets.length > 0 && (
                    <details className="mt-1 text-xs text-slate-500">
                      <summary className="cursor-pointer">該当 {r.targets.length} 件</summary>
                      <ul className="mt-1 list-disc pl-5">
                        {r.targets.map((t) => (
                          <li key={t} className="break-all">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="統計">
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => (
            <div
              key={t.id}
              data-testid={`stat-${t.id}`}
              className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.label}</p>
              <p className="text-lg font-semibold tabular-nums">{t.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="メッシュ">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">名前</th>
                <th className="py-1 pr-2 text-right font-medium">頂点</th>
                <th className="py-1 pr-2 text-right font-medium">三角形</th>
                <th className="py-1 font-medium">属性</th>
              </tr>
            </thead>
            <tbody>
              {stats.meshes.map((m, i) => (
                <tr
                  key={`${m.name}-${i}`}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="break-all py-1 pr-2">{m.name}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">
                    {formatNumber(m.vertexCount)}
                  </td>
                  <td className="py-1 pr-2 text-right tabular-nums">
                    {formatNumber(m.triangleCount)}
                  </td>
                  <td className="py-1 text-slate-500">
                    {[
                      m.isSkinned && 'スキン',
                      m.hasUv0 && 'UV0',
                      m.hasUv1 && 'UV1',
                      m.hasNormal && '法線',
                      m.morphTargetCount > 0 && `シェイプ ${m.morphTargetCount}`,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {model.diagnostics.length > 0 && (
        <Section title="ローダーの診断">
          <ul
            className="space-y-1 text-xs text-slate-600 dark:text-slate-400"
            data-testid="diagnostics"
          >
            {model.diagnostics.map((d) => (
              <li key={d.raw} title={d.raw}>
                ・{d.message}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Tips />
    </div>
  );
}

function Tips() {
  return (
    <Section title="ヒント">
      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
        <li>
          Blender の FBX 書き出しで「パスモード:
          コピー」にして埋め込みボタンをオンにすると、テクスチャが FBX に入り、FBX 1
          つをドロップするだけで済みます。
        </li>
        <li>
          マテリアルはブラウザ用に変換して表示しています。Unity
          のシェーダーの見た目とは一致しません。
        </li>
        <li>ファイルはブラウザの中だけで処理され、外部には送信されません。</li>
      </ul>
    </Section>
  );
}
