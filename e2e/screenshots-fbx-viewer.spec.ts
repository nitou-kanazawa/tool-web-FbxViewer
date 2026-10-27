import { expect, test, type Page } from '@playwright/test';

/**
 * FBX ビューアにモデルを読み込んだ状態のスクリーンショット（ダーク / ライト）。
 *   npm run screenshots
 * 何も読み込んでいない状態は screenshots.spec.ts が撮影する。
 */
async function load(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tools/fbx-viewer');
  await page.getByLabel('FBX ファイルを選択').setInputFiles('public/samples/sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');
  await page.getByLabel('アニメ FBX を追加').setInputFiles('public/samples/anim-walk.fbx');
  await page.getByRole('tab', { name: 'タイムライン' }).click();
  await expect(page.getByTestId('match-report')).toHaveAttribute('data-verdict', 'ok');
  // アニメの途中のポーズで止めてから撮る
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '一時停止' }).click();
}

for (const scheme of ['dark', 'light'] as const) {
  test(`FBX ビューア: 読み込んだ状態（${scheme}）`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await load(page);
    await page.screenshot({ path: `screenshots/tool-fbx-viewer-loaded-${scheme}.png` });
  });
}

test('FBX ビューア: 各ビュー', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await load(page);

  await page.getByRole('tab', { name: 'リグ', exact: true }).click();
  await page.getByTestId('bone-tree').getByText('mixamorigLeftArm', { exact: true }).click();
  await page.getByLabel('選んだボーンのウェイトを表示').check();
  await page.getByLabel('スケルトンを表示').check();
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-rig.png' });

  await page.getByRole('tab', { name: 'UV', exact: true }).click();
  await page.getByTestId('uv-mesh-item').dblclick();
  await page.getByTestId('uv-canvas').waitFor();
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-uv.png' });

  await page.getByRole('tab', { name: 'エクスプローラー', exact: true }).click();
  await page.getByRole('tab', { name: /3D ビュー/ }).click();
  await page.getByRole('button', { name: 'スケルトン', exact: true }).click();
  await page.getByRole('button', { name: 'モデルの概要に戻る' }).click();
  await page.getByTestId('shading-select').selectOption('toonOutline');
  await page.getByTestId('lighting-select').selectOption('outdoor');
  // 描き直しを待ってから撮る
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-toon.png' });
  await page.getByTestId('shading-select').selectOption('standard');
  await page.getByTestId('lighting-select').selectOption('studio');

  await page.keyboard.press('Control+Shift+P');
  await page.keyboard.type('表示');
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-palette.png' });
  await page.keyboard.press('Escape');

  await page.getByLabel('FBX ファイルを選択').setInputFiles('public/samples/cube.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');
  await page.getByRole('tab', { name: '問題' }).click();
  await page.getByTestId('wireframe-select').selectOption('overlay');
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-inspection.png' });
});
