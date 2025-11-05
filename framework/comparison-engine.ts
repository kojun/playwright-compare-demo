// framework/comparison-engine.ts
import { simpleDiff } from '../tests/compare.utils';
import { rowsEqual } from '../tests/db.utils';

export interface ComparisonResult {
  name: string;
  description: string;
  type: 'html' | 'database';
  passed: boolean;
  differences?: string[];
  summary: string;
}

export class ComparisonEngine {
  /**
   * HTML比較を実行
   */
  compareHTML(
    curData: string, 
    newData: string, 
    ignorePatterns: string[] = []
  ): ComparisonResult {
    const rawDifferences = simpleDiff(curData, newData);
    
    // 無視パターンに該当する差分をフィルタリング
    const significantDifferences = rawDifferences.filter(diff => {
      return !ignorePatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(diff);
      });
    });

    const passed = significantDifferences.length === 0;
    
    return {
      name: 'HTML Comparison',
      description: 'HTML content comparison between current and new systems',
      type: 'html',
      passed,
      differences: significantDifferences,
      summary: passed 
        ? `✅ HTML content matches (${rawDifferences.length} expected differences ignored)`
        : `❌ HTML content differs (${significantDifferences.length} significant differences found)`
    };
  }

  /**
   * データベース比較を実行
   */
  compareDatabase(curData: any[], newData: any[]): ComparisonResult {
    // created_at などのタイムスタンプ系フィールドを除外して比較
    const normalizeRow = (row: any) => {
      const normalized = { ...row };
      delete normalized.created_at;
      delete normalized.updated_at;
      return normalized;
    };

    const curNormalized = curData.map(normalizeRow);
    const newNormalized = newData.map(normalizeRow);
    
    const passed = rowsEqual(curNormalized, newNormalized);
    
    return {
      name: 'Database Comparison',
      description: 'Database state comparison between current and new systems',
      type: 'database',
      passed,
      differences: passed ? [] : [
        `Current system has ${curData.length} records`,
        `New system has ${newData.length} records`,
        'Data content differs'
      ],
      summary: passed 
        ? `✅ Database content matches (${curData.length} records)`
        : `❌ Database content differs (CUR: ${curData.length} records, NEW: ${newData.length} records)`
    };
  }

  /**
   * 比較結果のレポートを生成
   */
  generateReport(results: ComparisonResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    let report = `\n📊 Comparison Report\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Total comparisons: ${totalTests}\n`;
    report += `✅ Passed: ${passedTests}\n`;
    report += `❌ Failed: ${failedTests}\n`;
    report += `Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;

    results.forEach((result, index) => {
      report += `${index + 1}. ${result.name}\n`;
      report += `   ${result.summary}\n`;
      
      if (!result.passed && result.differences) {
        report += `   Differences (first 5):\n`;
        result.differences.slice(0, 5).forEach(diff => {
          report += `   - ${diff}\n`;
        });
        if (result.differences.length > 5) {
          report += `   ... and ${result.differences.length - 5} more\n`;
        }
      }
      report += `\n`;
    });

    return report;
  }
}