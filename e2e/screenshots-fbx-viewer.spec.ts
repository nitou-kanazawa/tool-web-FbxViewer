import { expect, test } from '@playwright/test';

/**
 * FBX ビューアにモデルを読み込んだ状態のスクリーンショット。
 *   npm run screenshots
 * 何も読み込んでいない状態は screenshots.spec.ts が撮影する。
 */
test('FBX ビューア: モデルとアニメを読み込んだ状態', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/tools/fbx-viewer');
  await page.getByLabel('FBX ファイルを選択').setInputFiles('public/samples/sample-character.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('sample-character.fbx');
  await page.getByLabel('アニメ FBX を追加').setInputFiles('public/samples/anim-walk.fbx');
  await expect(page.getByTestId('match-report')).toHaveAttribute('data-verdict', 'ok');
  // アニメの途中のポーズで止めてから撮る
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-loaded.png', fullPage: true });

  await page.getByRole('tab', { name: 'UV' }).click();
  await page.getByTestId('uv-canvas').waitFor();
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-uv.png', fullPage: true });

  await page.getByRole('tab', { name: 'リグ' }).click();
  await page
    .getByTestId('bone-tree')
    .getByRole('button', { name: /LeftArm$/ })
    .click();
  await page.getByLabel('スケルトンを表示').check();
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-rig.png', fullPage: true });

  await page.getByRole('tab', { name: '概要・検品' }).click();
  await page.getByLabel('FBX ファイルを選択').setInputFiles('public/samples/cube.fbx');
  await expect(page.getByTestId('file-name')).toHaveText('cube.fbx');
  await page.getByTestId('wireframe-select').selectOption('overlay');
  await page.screenshot({ path: 'screenshots/tool-fbx-viewer-inspection.png', fullPage: true });
});
