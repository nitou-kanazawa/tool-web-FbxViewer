import { expect, test, type Page } from '@playwright/test';

const SAMPLES = 'public/samples';

async function openViewer(page: Page) {
  await page.goto('/#/tools/fbx-viewer');
  await expect(page.getByTestId('workbench')).toBeVisible();
}

async function openModel(page: Page, ...files: string[]) {
  await page.getByLabel('FBX ファイルを選択').setInputFiles(files.map((f) => `${SAMPLES}/${f}`));
}

async function addAnimation(page: Page, file: string) {
  await page.getByLabel('アニメ FBX を追加').setInputFiles(`${SAMPLES}/${file}`);
}

/** アクティビティバーでサイドバーのビューを切り替える（表示中なら何もしない）。 */
async function showView(page: Page, name: string) {
  const tab = page.getByRole('tab', { name, exact: true });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
}

test('トップページから FBX ビューアを開ける', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /FBX ビューア/ }).click();
  await expect(page.getByText('ここに FBX をドラッグ＆ドロップ')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ツール一覧' })).toBeVisible();
});

test('FBX を読み込むと、インスペクターに統計、問題パネルに検品結果が出る', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');

  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');
  await expect(page.getByTestId('stat-triangles')).toContainText('180');
  await expect(page.getByTestId('stat-bones')).toContainText('16');
  await expect(page.getByTestId('model-size')).toContainText('1.780 m');
  await expect(page.getByTestId('inspection-C-01')).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('inspection-C-10')).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('status-problems')).toHaveText(/0\s*0/);
  await expect(page.getByTestId('status-file')).toHaveText('sample-character.fbx');
  // シーンの階層がエクスプローラーに出る
  await expect(page.getByTestId('scene-tree').getByText('Body')).toBeVisible();
});

test('外部テクスチャは一緒に渡した画像で解決される', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'cube.fbx');
  await expect(page.getByTestId('inspection-C-10')).toHaveAttribute('data-level', 'ng');
  await expect(page.getByTestId('inspection-C-04')).toHaveAttribute('data-level', 'warn');
  await expect(page.getByTestId('inspection-C-05')).toHaveAttribute('data-level', 'warn');
  await expect(page.getByTestId('status-problems')).toHaveText(/1\s*3/);

  await openModel(page, 'cube.fbx', 'cube_basecolor.png');
  await expect(page.getByTestId('inspection-C-10')).toHaveAttribute('data-level', 'ok');
  // 300×300 は 2 のべき乗ではない
  await expect(page.getByTestId('inspection-C-11')).toHaveAttribute('data-level', 'warn');
});

test('FBX でないファイルはエラーを通知し、直前のモデルは残る', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'cube.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');

  await openModel(page, 'not-fbx.fbx');
  await expect(page.getByTestId('error-message')).toContainText(
    'FBX ファイルとして読み込めませんでした',
  );
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');
  // 出力パネルにも残る
  await page.getByRole('tab', { name: '出力' }).click();
  await expect(page.getByTestId('output')).toContainText('FBX ファイルとして読み込めませんでした');
});

test('アニメ FBX を追加してモデルに当て、タイムラインで再生できる', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');

  await addAnimation(page, 'anim-walk.fbx');
  await page.getByRole('tab', { name: 'タイムライン' }).click();
  await expect(page.getByTestId('match-report')).toHaveAttribute('data-verdict', 'ok');
  await expect(page.getByTestId('match-report')).toContainText('7 / 7 一致');

  // 追加すると自動で再生が始まり、フレームが進む
  await expect(page.getByTestId('frame-counter')).not.toContainText(/^0 \//, { timeout: 5000 });
  await page.getByRole('button', { name: '一時停止' }).click();
  await expect(page.getByRole('button', { name: '再生' })).toBeVisible();

  // アニメーションのビューにクリップが並ぶ
  await showView(page, 'アニメーション');
  await expect(page.getByTestId('clip-item')).toHaveCount(2);
});

test('リグのないモデルにアニメを当てると理由を表示する', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'cube.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');
  await addAnimation(page, 'anim-wave.fbx');
  await page.getByRole('tab', { name: 'タイムライン' }).click();
  await expect(page.getByTestId('match-report')).toHaveAttribute('data-verdict', 'no-skeleton');
  await expect(page.getByTestId('match-report')).toContainText('リグがありません');
});

test('テクスチャ・UV・リグのビューから詳細を開ける', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');

  await showView(page, 'テクスチャ');
  await expect(page.getByTestId('texture-item')).toContainText('ベースカラー');
  await page.getByTestId('texture-item').dblclick();
  await expect(page.getByTestId('editor-tab-texture')).toBeVisible();

  await showView(page, 'UV');
  await page.getByTestId('uv-mesh-item').dblclick();
  await expect(page.getByTestId('editor-tab-uv')).toBeVisible();
  await expect(page.getByTestId('uv-canvas')).toBeVisible();
  await expect(page.getByTestId('uv-stats')).toContainText('三角形: 180');

  await showView(page, 'リグ');
  await expect(page.getByTestId('humanoid-check')).toContainText('15/15');
  await page.getByTestId('bone-tree').getByText('mixamorigLeftArm', { exact: true }).click();
  await expect(page.getByTestId('inspector-title')).toHaveText('mixamorigLeftArm');
  await page.getByLabel('選んだボーンのウェイトを表示').check();
  await page.getByRole('tab', { name: /3D ビュー/ }).click();
  await expect(page.getByTestId('shading-select')).toHaveValue('boneWeight');
});

test('キーボードとコマンドパレットで操作できる', async ({ page }) => {
  await openViewer(page);
  await openModel(page, 'sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');

  await expect(page.getByTestId('sidebar')).toBeVisible();
  await page.keyboard.press('Control+B');
  await expect(page.getByTestId('sidebar')).toBeHidden();
  await page.keyboard.press('Control+B');
  await expect(page.getByTestId('sidebar')).toBeVisible();

  await page.keyboard.press('Control+Shift+P');
  const palette = page.getByRole('dialog', { name: 'コマンド パレット' });
  await expect(palette).toBeVisible();
  await page.keyboard.type('ワイヤー');
  await page.keyboard.press('Enter');
  await expect(palette).toBeHidden();
  await expect(page.getByTestId('wireframe-select')).toHaveValue('overlay');

  // 文字キーのショートカットは入力中には効かない
  await page.getByTestId('wireframe-select').focus();
  await page.keyboard.press('Escape');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('W');
  await expect(page.getByTestId('wireframe-select')).toHaveValue('only');
});
