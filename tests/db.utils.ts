import pg from 'pg';

export async function withDb<T>(cfg: {host:string,port:number,user:string,password:string,database:string}, fn:(c:pg.Client)=>Promise<T>) {
  const c = new pg.Client(cfg);
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}

export async function fetchRows(cfg:any, sql:string, params:any[] = []) {
  return withDb(cfg, async (c) => (await c.query(sql, params)).rows);
}

export function rowsEqual(a:any[], b:any[]) {
  const norm = (rows:any[]) => JSON.stringify(rows.map(r=>Object.fromEntries(Object.entries(r).sort(([k1],[k2])=>k1.localeCompare(k2)))).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))));
  return norm(a) === norm(b);
}