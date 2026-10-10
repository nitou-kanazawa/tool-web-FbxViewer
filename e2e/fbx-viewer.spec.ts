import { expect, test, type Page } from '@playwright/test';

const SAMPLES = 'public/samples';

async function openViewer(page: Page) {
  await page.goto('/#/tools/fbx-viewer');
  await expect(page.getByLabel('FBX ファイルのドロップ領域')).toBeVisible();
}

async function openModel(page: Page, ...files: string[]) {
  await page.getByLabel('FBX ファイルを選択').setInputFiles(files.map((f) => `${SAMPLES}/${f}`));
}

test('トップページから FBX ビューアを開ける', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /FBX ビューア/ }).click();
  await expect(page.getByText('ここに FBX をドラッグ＆ドロップ')).toBeVisible();
});

test('FBX を読み込むと統計と検品結果が表示される', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');

  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');
  await expect(page.getByTestId('stat-triangles')).toContainText('180');
  await expect(page.getByTestId('stat-bones')).toContainText('16');
  await expect(page.getByTestId('model-size')).toContainText('高さ 1.780 m');
  await expect(page.getByTestId('inspection-C-01')).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('inspection-C-10')).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('inspection-summary')).toContainText('NG 0');
});

test('外部テクスチャは一緒に渡した画像で解決される', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'cube.fbx');
  await expect(page.getByTestId('inspection-C-10')).toHaveAttribute('data-level', 'ng');
  await expect(page.getByTestId('inspection-C-04')).toHaveAttribute('data-level', 'warn');
  await expect(page.getByTestId('inspection-C-05')).toHaveAttribute('data-level', 'warn');

  await openModel(page, 'cube.fbx', 'cube_basecolor.png');
  await expect(page.getByTestId('inspection-C-10')).toHaveAttribute('data-level', 'ok');
  // 300×300 は 2 のべき乗ではない
  await expect(page.getByTestId('inspection-C-11')).toHaveAttribute('data-level', 'warn');
});

test('FBX でないファイルはエラーを表示し、直前のモデルは残る', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'cube.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');

  await openModel(page, 'not-fbx.fbx');
  await expect(page.getByTestId('error-message')).toContainText(
    'FBX ファイルとして読み込めませんでした',
  );
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');
});

test('アニメ FBX を追加してモデルに当て、再生できる', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');

  await page.getByLabel('アニメ FBX を追加').setInputFiles(`${SAMPLES}/anim-walk.fbx`);
  await expect(page.getByTestId('clip-select')).toHaveValue(/::0$/);
  await page.getByTestId('clip-select').selectOption({ label: 'Walk（anim-walk.fbx）' });
  await expect(page.getByTestId('match-report')).toHaveAttribute('data-verdict', 'ok');
  await expect(page.getByTestId('match-report')).toContainText('7 / 7 一致');

  // 選ぶと自動で再生が始まり、フレームが進む
  await expect(page.getByTestId('frame-counter')).not.toContainText(/^0 \//, { timeout: 5000 });
  await page.getByRole('button', { name: '一時停止' }).click();
  await expect(page.getByRole('button', { name: '再生' })).toBeVisible();
});

test('リグのないモデルにアニメを当てると理由を表示する', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'cube.fbx');
  await page.getByLabel('アニメ FBX を追加').setInputFiles(`${SAMPLES}/anim-wave.fbx`);
  await expect(page.getByTestId('match-report')).toHaveAttribute('data-verdict', 'no-skeleton');
  await expect(page.getByTestId('match-report')).toContainText('リグがありません');
});

test('テクスチャ・UV・リグのパネルを表示できる', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');

  await page.getByRole('tab', { name: 'テクスチャ' }).click();
  await expect(page.getByTestId('texture-item')).toContainText('埋め込み');
  await expect(page.getByTestId('texture-item')).toContainText('256×256');

  await page.getByRole('tab', { name: 'UV' }).click();
  await expect(page.getByTestId('uv-canvas')).toBeVisible();
  await expect(page.getByTestId('uv-stats')).toContainText('三角形: 180');

  await page.getByRole('tab', { name: 'リグ' }).click();
  await expect(page.getByTestId('bone-tree').getByRole('button')).toHaveCount(16);
  await expect(page.getByText('Unity Humanoid の必須ボーン（15 / 15）')).toBeVisible();
  await page
    .getByTestId('bone-tree')
    .getByRole('button', { name: /LeftArm$/ })
    .click();
  await expect(page.getByTestId('shading-select')).toHaveValue('boneWeight');
});
