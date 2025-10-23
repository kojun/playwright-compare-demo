import { Page } from '@playwright/test';

export async function fetchNormalizedHTML(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  let html = await page.content();
  html = html
    .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '__DATE__')
    .replace(/JSESSIONID=[^;\"]+/g, 'JSESSIONID=__MASK__')
    .replace(/csrf[^"']+/gi, 'csrf=__MASK__')
    .replace(/\s+/g, ' ') // 空白正規化
    .trim();
  return html;
}

export function simpleDiff(a: string, b: string): string[] {
  if (a === b) return [];
  const A = a.split(' '), B = b.split(' ');
  const out: string[] = [];
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (A[i] !== B[i]) { out.push(`pos ${i}: "${A[i]||''}" vs "${B[i]||''}"`); if (out.length > 30) break; }
  }
  return out;
}