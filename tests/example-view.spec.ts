// tests/example-view.spec.ts
import { test, expect } from '@playwright/test';
import { fetchNormalizedHTML, simpleDiff } from './compare.utils';

const CUR = 'http://localhost:3001';
const NEW = 'http://localhost:3002';

test('顧客一覧: 現新のHTML比較', async ({ page, context }) => {
  // HTMLを取得
  const curHtml = await fetchNormalizedHTML(page, CUR + '/customers');
  const p2 = await context.newPage();
  const newHtml = await fetchNormalizedHTML(p2, NEW + '/customers');
  await p2.close();

  // テーブル行を抽出
  const curTableRows = curHtml.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
  const newTableRows = newHtml.match(/<tr[^>]*>.*?<\/tr>/gs) || [];

  // 行数チェック
  expect(curTableRows.length).toBe(newTableRows.length);

  // ヘッダー行と最初の2行は完全一致をチェック
  for (let i = 0; i < Math.min(3, curTableRows.length); i++) {
    expect(curTableRows[i]).toBe(newTableRows[i]);
  }

  // 残りの行はEmail列を除いて比較
  for (let i = 3; i < curTableRows.length; i++) {
    const curCells = curTableRows[i].match(/<td[^>]*>.*?<\/td>/gs) || [];
    const newCells = newTableRows[i].match(/<td[^>]*>.*?<\/td>/gs) || [];
    
    for (let j = 0; j < curCells.length; j++) {
      if (j === 2) continue; // Email列をスキップ
      expect(curCells[j]).toBe(newCells[j]);
    }
  }
});