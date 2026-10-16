import { expect, test } from '@playwright/test';

const isDark = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

test('既定では OS の設定（prefers-color-scheme）に従う', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await isDark(page)).toBe(true);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => isDark(page)).toBe(false);
});

test('テーマを切り替えると保存され、ツールページでも引き継がれる', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.getByRole('group', { name: '表示テーマ' });
  await toggle.getByRole('button', { name: /ダーク/ }).click();
  await expect(toggle.getByRole('button', { name: /ダーク/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await isDark(page)).toBe(true);

  await page.goto('/#/tools/word-counter');
  await page.reload();
  expect(await isDark(page)).toBe(true);

  await page
    .getByRole('group', { name: '表示テーマ' })
    .getByRole('button', { name: /ライト/ })
    .click();
  expect(await isDark(page)).toBe(false);
});
