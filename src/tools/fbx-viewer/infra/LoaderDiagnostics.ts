/**
 * FBXLoader が console.warn で出す警告を集めて、意味のあるコードに分類する。
 * FBXLoader の警告文に依存するのはこのファイルだけにする（設計書 §5.2）。
 */

export type DiagnosticCode =
  | 'Z_UP_CORRECTED'
  | 'WEIGHTS_TRUNCATED'
  | 'LAYERED_TEXTURE'
  | 'MULTI_LAYER_ANIMATION'
  | 'NEGATIVE_MATERIAL_INDEX'
  | 'UNSUPPORTED_MAP'
  | 'UNSUPPORTED_IMAGE'
  | 'OTHER';

export interface LoaderDiagnostic {
  code: DiagnosticCode;
  /** 日本語の説明 */
  message: string;
  /** ローダーが出した元の文 */
  raw: string;
}

const RULES: { pattern: RegExp; code: DiagnosticCode; message: string }[] = [
  {
    pattern: /Z-UP coordinate system/i,
    code: 'Z_UP_CORRECTED',
    message: 'Z-up のファイルです。表示用にルートを X 軸 -90° 回転しました。',
  },
  {
    pattern: /more than 4 skinning weights/i,
    code: 'WEIGHTS_TRUNCATED',
    message: '5 本以上のウェイトを持つ頂点があります。表示では上位 4 本だけを使っています。',
  },
  {
    pattern: /layered textures are not supported/i,
    code: 'LAYERED_TEXTURE',
    message: 'レイヤードテクスチャがあります。最初のレイヤーだけを表示しています。',
  },
  {
    pattern: /animation stack with multiple layers/i,
    code: 'MULTI_LAYER_ANIMATION',
    message: '複数レイヤーのアニメーションがあります。最初のレイヤーだけを読み込みました。',
  },
  {
    pattern: /negative\) material indices/i,
    code: 'NEGATIVE_MATERIAL_INDEX',
    message: '不正な（負の）マテリアル番号があります。表示が崩れる可能性があります。',
  },
  {
    pattern: /map is not supported in three\.js/i,
    code: 'UNSUPPORTED_MAP',
    message: 'ビューアが対応していない種類のテクスチャスロットがあります（表示はされません）。',
  },
  {
    pattern: /Image type ".*" is not supported|TGA loader not found/i,
    code: 'UNSUPPORTED_IMAGE',
    message: '対応していない形式の埋め込み画像があります。',
  },
];

export function classifyWarning(raw: string): LoaderDiagnostic {
  const rule = RULES.find((r) => r.pattern.test(raw));
  if (rule) return { code: rule.code, message: rule.message, raw };
  return { code: 'OTHER', message: raw, raw };
}

/** console.warn の引数を 1 つの文字列にする（%s の置換に対応）。 */
export function formatWarnArgs(args: unknown[]): string {
  if (args.length === 0) return '';
  const [first, ...rest] = args;
  if (typeof first === 'string' && first.includes('%')) {
    let i = 0;
    const replaced = first.replace(/%[sdoifO]/g, () => (i < rest.length ? String(rest[i++]) : ''));
    return [replaced, ...rest.slice(i).map(String)].join(' ').trim();
  }
  return args.map(String).join(' ').trim();
}

/**
 * fn を実行している間だけ console.warn を差し替えて、警告を集める。
 * fn が例外を投げても console.warn は必ず元に戻す。同じ警告は 1 件にまとめる。
 */
export function collectWarnings<T>(fn: () => T): { result: T; diagnostics: LoaderDiagnostic[] } {
  const original = console.warn;
  const raws: string[] = [];
  console.warn = (...args: unknown[]) => {
    raws.push(formatWarnArgs(args));
  };
  try {
    const result = fn();
    return { result, diagnostics: dedupe(raws).map(classifyWarning) };
  } finally {
    console.warn = original;
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
