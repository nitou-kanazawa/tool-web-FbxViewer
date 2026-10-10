import type { MatchReport } from '../../logic/boneMatching';

const VERDICT: Record<MatchReport['verdict'], { text: string; className: string }> = {
  ok: { text: '✅ すべてのボーンが一致', className: 'text-emerald-700 dark:text-emerald-400' },
  partial: {
    text: '⚠️ 一部のボーンが一致しません（そのボーンは動きません）',
    className: 'text-amber-700 dark:text-amber-400',
  },
  'no-skeleton': {
    text: '❌ このモデルにはリグがありません',
    className: 'text-red-700 dark:text-red-400',
  },
  'no-match': { text: '❌ ボーン名が一致しません', className: 'text-red-700 dark:text-red-400' },
};

/** ボーン照合の結果（F-2-06, F-2-07）。 */
export function MatchReportView({ report }: { report: MatchReport }) {
  const v = VERDICT[report.verdict];
  return (
    <div className="text-xs" data-testid="match-report" data-verdict={report.verdict}>
      <p className={v.className}>
        {v.text}
        {report.verdict !== 'no-skeleton' && (
          <span className="ml-2 text-slate-500">
            ボーン照合: {report.matchedCount} / {report.animBoneCount} 一致
          </span>
        )}
      </p>
      {(report.unmatchedAnim.length > 0 || report.unmatchedModel.length > 0) &&
        report.verdict !== 'no-skeleton' && (
          <details className="mt-1 text-slate-500">
            <summary className="cursor-pointer">一致しなかったボーン</summary>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="font-medium">アニメ側（{report.unmatchedAnim.length}）</p>
                <p className="break-all">{report.unmatchedAnim.join(', ') || '―'}</p>
              </div>
              <div>
                <p className="font-medium">モデル側（{report.unmatchedModel.length}）</p>
                <p className="break-all">{report.unmatchedModel.join(', ') || '―'}</p>
              </div>
            </div>
          </details>
        )}
    </div>
  );
}
