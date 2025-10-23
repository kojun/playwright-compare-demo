// tests/example-view.spec.ts
import { test, expect } from '@playwright/test';
import { fetchNormalizedHTML, simpleDiff } from './compare.utils';

const CUR = 'http://localhost:3001';
const NEW = 'http://localhost:3002';

test('顧客一覧: 現新のHTML比較', async ({ page, context }) => {
  const curHtml = await fetchNormalizedHTML(page, CUR + '/customers');
  const p2 = await context.newPage();
  const newHtml = await fetchNormalizedHTML(p2, NEW + '/customers');
  await p2.close();
  const diffs = simpleDiff(curHtml, newHtml)
    .filter(d => !d.includes('<title>') && !d.includes('<h1>')); // タイトル・ヘッダの差分は無視
  expect(diffs.length).toBe(0);
});