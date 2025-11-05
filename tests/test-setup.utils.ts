// tests/test-setup.utils.ts
import { fetchRows } from './db.utils';

export async function resetCustomersToInitialState(dbConfig: any) {
  const { withDb } = await import('./db.utils');
  
  await withDb(dbConfig, async (client) => {
    // 3番以降のIDの顧客を削除（初期データは1,2のID）
    await client.query('DELETE FROM customers WHERE id > 2');
    
    // シーケンスをリセット
    await client.query('SELECT setval(\'customers_id_seq\', 2, true)');
  });
}

export async function getCustomerCount(dbConfig: any): Promise<number> {
  const rows = await fetchRows(dbConfig, 'SELECT COUNT(*) as count FROM customers');
  return parseInt(rows[0].count);
}