// tests/dsl-test-runner.spec.ts
import { test, expect, Browser } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { SelectorEngine } from '../framework/selector-engine';
import { EnvironmentManager } from '../framework/environment-manager';
import { DSLEngine } from '../framework/dsl-engine';
import { ComparisonEngine } from '../framework/comparison-engine';

test.describe('DSL-based Scenario Testing', () => {
  test('Generic DSL Scenario Runner', async ({ browser }) => {
    // フレームワークの初期化
    const environmentManager = new EnvironmentManager();
    const selectorDictionary = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'config', 'selectors.json'), 'utf-8')
    );
    const selectorEngine = new SelectorEngine(selectorDictionary);
    const dslEngine = new DSLEngine(selectorEngine, environmentManager);
    const comparisonEngine = new ComparisonEngine();

    // 環境変数からシナリオ名を取得（デフォルト: scenario1）
    const scenarioName = process.env.SCENARIO || 'scenario1';
    const scenarioPath = path.join(process.cwd(), 'config', 'scenarios', `${scenarioName}.yaml`);
    
    // シナリオファイルの存在確認
    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Scenario file not found: ${scenarioPath}. Available scenarios: ${getAvailableScenarios().join(', ')}`);
    }
    
    const scenario = dslEngine.loadScenario(scenarioPath);
    console.log(`📋 Running scenario: ${scenarioName}`);
    
    /**
     * 利用可能なシナリオファイル一覧を取得
     */
    function getAvailableScenarios(): string[] {
      const scenariosDir = path.join(process.cwd(), 'config', 'scenarios');
      try {
        return fs.readdirSync(scenariosDir)
          .filter(file => file.endsWith('.yaml'))
          .map(file => file.replace('.yaml', ''));
      } catch {
        return [];
      }
    }

    console.log(`🎯 Test Mode: ${environmentManager.getTestMode()}`);

    if (environmentManager.getTestMode() === 'single') {
      // 単一環境でのテスト実行
      const targetEnv = environmentManager.getTargetEnvironment();
      console.log(`🔧 Testing on ${targetEnv.name} environment only`);
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        await dslEngine.executeScenario(scenario, page, targetEnv);
        console.log(`✅ Scenario completed successfully on ${targetEnv.name}`);
      } finally {
        await context.close();
      }

    } else {
      // 現新比較テスト (SSCM: Strict Same Code Mode)
      const environments = environmentManager.getBothEnvironments();
      const results: any[] = [];
      
      console.log('🔄 Starting SSCM (Strict Same Code Mode) comparison test');
      console.log(`📝 Scenario: ${scenario.name}`);
      console.log(`📋 Description: ${scenario.description}`);

      // 現システムでテスト実行
      const curContext = await browser.newContext();
      const curPage = await curContext.newPage();
      
      // 新システムでテスト実行  
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();

      try {
        console.log('🟦 Executing scenario on CURRENT system...');
        const curEngine = new DSLEngine(selectorEngine, environmentManager);
        await curEngine.executeScenario(scenario, curPage, environments.current);
        const curData = curEngine.getCapturedData();

        console.log('🟨 Executing scenario on NEW system...');
        const newEngine = new DSLEngine(selectorEngine, environmentManager);
        await newEngine.executeScenario(scenario, newPage, environments.new);
        const newData = newEngine.getCapturedData();

        console.log('🔍 Performing comparisons...');
        
        // 比較実行
        for (const comparison of scenario.comparisons) {
          const curKey = `${comparison.source}_${environments.current.name}`;
          const newKey = `${comparison.source}_${environments.new.name}`;
          
          const curValue = curData.get(curKey);
          const newValue = newData.get(newKey);

          if (!curValue || !newValue) {
            console.warn(`⚠️ Missing data for comparison: ${comparison.name}`);
            continue;
          }

          let result;
          if (comparison.type === 'html') {
            result = comparisonEngine.compareHTML(
              curValue, 
              newValue, 
              comparison.ignorePatterns
            );
          } else if (comparison.type === 'database') {
            result = comparisonEngine.compareDatabase(curValue, newValue);
          } else {
            console.warn(`⚠️ Unknown comparison type: ${comparison.type}`);
            continue;
          }

          result.name = comparison.name;
          result.description = comparison.description;
          results.push(result);
        }

        // レポート生成と結果確認
        const report = comparisonEngine.generateReport(results);
        console.log(report);

        // テスト結果の検証
        const failedComparisons = results.filter(r => !r.passed);
        if (failedComparisons.length > 0) {
          console.error('❌ Some comparisons failed:');
          failedComparisons.forEach(result => {
            console.error(`   - ${result.name}: ${result.summary}`);
          });
        }

        // すべての比較が成功することを期待
        expect(failedComparisons.length).toBe(0);
        
        console.log('🎉 SSCM comparison test completed successfully');

      } finally {
        await curContext.close();
        await newContext.close();
      }
    }
  });
});