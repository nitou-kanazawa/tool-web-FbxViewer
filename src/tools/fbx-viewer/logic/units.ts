/**
 * FBX の UnitScaleFactor（1 単位が何 cm か）から、メートルへの倍率を求める。
 * Unity の「Convert Units」と同じ換算（設計書 §5.3）。
 */
export function fileUnitsToMeters(unitScaleFactor: number): number {
  if (!Number.isFinite(unitScaleFactor) || unitScaleFactor <= 0) return 0.01;
  return unitScaleFactor / 100;
}

/** 1 単位の大きさを日本語で表す（1 → "cm"、100 → "m"）。 */
export function describeUnit(unitScaleFactor: number): string {
  if (unitScaleFactor === 1) return 'cm';
  if (unitScaleFactor === 100) return 'm';
  if (unitScaleFactor === 0.1) return 'mm';
  if (unitScaleFactor === 2.54) return 'inch';
  return `${unitScaleFactor} cm`;
}
