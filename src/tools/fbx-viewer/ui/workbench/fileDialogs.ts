/**
 * ファイル選択ダイアログを開く。入力要素は Workbench が 1 つずつ置き、ここに登録する。
 * キーボードショートカット（Ctrl+O）やコマンドパレットからも開けるようにするため。
 */
const inputs: Partial<Record<'model' | 'animation', HTMLInputElement | null>> = {};

export function registerFileInput(kind: 'model' | 'animation', el: HTMLInputElement | null) {
  inputs[kind] = el;
}

export function openFileDialog(kind: 'model' | 'animation') {
  inputs[kind]?.click();
}
