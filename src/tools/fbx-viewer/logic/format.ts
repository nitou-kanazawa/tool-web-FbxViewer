const numberFormat = new Intl.NumberFormat('ja-JP');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatMeters(value: number): string {
  return `${value.toFixed(value >= 10 ? 1 : 3)} m`;
}
