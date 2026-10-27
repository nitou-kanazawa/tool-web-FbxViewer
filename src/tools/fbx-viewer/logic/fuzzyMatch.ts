/**
 * コマンドパレットのあいまい検索（設計書 §15.3）。
 * 検索語の文字が順番どおりに含まれていれば一致とし、連続・先頭一致ほど高い点数にする。
 */
export interface FuzzyResult {
  score: number;
  /** 一致した文字の位置（強調表示用） */
  positions: number[];
}

export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (q === '') return { score: 0, positions: [] };
  const t = text.toLowerCase();
  // まず部分一致を探す（一番わかりやすい一致）
  const direct = t.indexOf(q);
  if (direct >= 0) {
    return {
      score: 1000 - direct * 2 - (t.length - q.length) * 0.1,
      positions: Array.from({ length: q.length }, (_, i) => direct + i),
    };
  }
  const positions: number[] = [];
  let score = 0;
  let from = 0;
  for (const ch of q) {
    const i = t.indexOf(ch, from);
    if (i < 0) return null;
    const consecutive = positions.length > 0 && positions[positions.length - 1] === i - 1;
    score += consecutive ? 10 : 1;
    if (i === 0 || /[\s:：/（(・]/.test(t[i - 1])) score += 5;
    positions.push(i);
    from = i + 1;
  }
  return { score: score - (t.length - q.length) * 0.05, positions };
}

/** 一致した項目を点数の高い順に並べる。検索語が空なら元の順のまま。 */
export function fuzzyFilter<T>(items: ReadonlyArray<T>, query: string, text: (item: T) => string) {
  return items
    .map((item, index) => ({ item, index, match: fuzzyMatch(query, text(item)) }))
    .filter((r): r is { item: T; index: number; match: FuzzyResult } => r.match !== null)
    .sort((a, b) => b.match.score - a.match.score || a.index - b.index);
}
