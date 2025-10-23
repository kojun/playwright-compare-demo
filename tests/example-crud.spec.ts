// tests/example-crud.spec.ts
import { test, expect } from '@playwright/test';
import { fetchRows, rowsEqual } from './db.utils';

const CUR = 'http://localhost:3001';
const NEW = 'http://localhost:3002';

const CUR_DB = { host:'localhost', port:5433, user:'app', password:'app', database:'appdb' };
const NEW_DB = { host:'localhost', port:5434, user:'app', password:'app', database:'appdb' };

async function createCustomer(base: string, page) {
  await page.goto(base + '/customers/new');
  await page.fill('input[name="name"]', 'プレ比較');
  await page.fill('input[name="email"]', `demo_${Date.now()}@example.com`);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);
}

test('顧客登録の現新比較（DB内容一致）', async ({ browser }) => {
  // 現・新に同じ操作を実施
  const p1 = await browser.newPage();
  await createCustomer(CUR, p1); await p1.close();

  const p2 = await browser.newPage();
  await createCustomer(NEW, p2); await p2.close();

  // DB状態を比較（簡易：全件一致）
  const curRows = await fetchRows(CUR_DB, 'SELECT id,name,email FROM customers ORDER BY id');
  const newRows = await fetchRows(NEW_DB, 'SELECT id,name,email FROM customers ORDER BY id');
  expect(rowsEqual(curRows, newRows)).toBe(true);
});
