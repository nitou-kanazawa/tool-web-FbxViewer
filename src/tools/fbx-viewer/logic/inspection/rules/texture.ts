import { isPowerOfTwo } from '../../textures';
import type { InspectionRule } from '../types';

export const missingTextureRule: InspectionRule = {
  id: 'C-10',
  title: 'テクスチャの欠落',
  category: 'テクスチャ',
  evaluate: ({ textures }) => {
    if (!textures) return { level: 'skip', message: 'テクスチャを読み込み中です' };
    if (textures.length === 0) return { level: 'ok', message: 'テクスチャはありません' };
    const missing = textures.filter((t) => t.status === 'missing').map((t) => t.name);
    const unsupported = textures.filter((t) => t.status === 'unsupported').map((t) => t.name);
    if (missing.length + unsupported.length > 0) {
      const parts = [];
      if (missing.length) parts.push(`見つからない: ${missing.length} 枚`);
      if (unsupported.length) parts.push(`未対応の形式: ${unsupported.length} 枚`);
      return {
        level: 'ng',
        message: `${parts.join('、')}。画像ファイルも一緒にドロップしてください`,
        targets: [...missing, ...unsupported.map((n) => `${n}（未対応）`)],
      };
    }
    return { level: 'ok', message: `${textures.length} 枚すべて読み込めました` };
  },
};

export const textureSizeRule: InspectionRule = {
  id: 'C-11',
  title: 'テクスチャ解像度',
  category: 'テクスチャ',
  evaluate: ({ textures, preset }) => {
    if (!textures) return { level: 'skip', message: 'テクスチャを読み込み中です' };
    const sized = textures.filter(
      (t) => t.status !== 'missing' && t.status !== 'unsupported' && t.width && t.height,
    );
    if (sized.length === 0) return { level: 'skip', message: '判定できるテクスチャがありません' };
    const tooLarge = sized.filter((t) => Math.max(t.width!, t.height!) > preset.maxTextureSize);
    const notPot = sized.filter((t) => !isPowerOfTwo(t.width!) || !isPowerOfTwo(t.height!));
    const label = (t: (typeof sized)[number]) => `${t.name}（${t.width}×${t.height}）`;
    if (tooLarge.length > 0) {
      return {
        level: 'ng',
        message: `上限 ${preset.maxTextureSize} を超えるテクスチャがあります`,
        targets: tooLarge.map(label),
      };
    }
    if (notPot.length > 0) {
      return {
        level: 'warn',
        message: '2 のべき乗ではないテクスチャがあります',
        targets: notPot.map(label),
      };
    }
    const max = Math.max(...sized.map((t) => Math.max(t.width!, t.height!)));
    return { level: 'ok', message: `最大 ${max} px（上限 ${preset.maxTextureSize}）` };
  },
};
