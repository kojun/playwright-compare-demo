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
        const executionResults = await dslEngine.executeScenario(scenario, page, targetEnv);
        
        // 実行結果の保存
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultDir = path.join(process.cwd(), 'test-execution-results', 'single-runs');
        
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(resultDir)) {
          fs.mkdirSync(resultDir, { recursive: true });
        }
        
        const resultFile = path.join(resultDir, `${scenarioName}_${targetEnv.name}_${timestamp}.json`);
        
        const report = {
          scenario: scenario.name,
          description: scenario.description,
          environment: targetEnv.name,
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          executionTime: Date.now(), // 実際の実行時間は別途計測が必要
          capturedData: Array.from(executionResults.entries()).reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {} as Record<string, any>),
          summary: {
            totalSteps: scenario.steps.length,
            capturedItems: executionResults.size,
            environmentUrl: targetEnv.baseUrl
          }
        };
        
        // 結果をJSONファイルに保存
        fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
        
        console.log(`✅ Scenario completed successfully on ${targetEnv.name}`);
        console.log(`💾 Results saved to: ${resultFile}`);
        console.log(`📊 Captured ${executionResults.size} data items across ${scenario.steps.length} steps`);
        
        // 簡易サマリーを表示
        console.log('\n📋 Execution Summary:');
        for (const [key, value] of executionResults) {
          if (typeof value === 'string' && value.length > 100) {
            console.log(`   ${key}: HTML content (${value.length} chars)`);
          } else if (Array.isArray(value)) {
            console.log(`   ${key}: Database records (${value.length} items)`);
          } else {
            console.log(`   ${key}: ${typeof value}`);
          }
        }
        
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

        // 比較結果の保存
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const comparisonResultDir = path.join(process.cwd(), 'test-execution-results', 'comparisons');
        
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(comparisonResultDir)) {
          fs.mkdirSync(comparisonResultDir, { recursive: true });
        }
        
        const comparisonResultFile = path.join(comparisonResultDir, `${scenarioName}_comparison_${timestamp}.json`);
        
        const comparisonReport = {
          scenario: scenario.name,
          description: scenario.description,
          timestamp: new Date().toISOString(),
          status: results.filter(r => !r.passed).length === 0 ? 'SUCCESS' : 'FAILED',
          environments: {
            current: environments.current.name,
            new: environments.new.name
          },
          results: results,
          summary: {
            totalComparisons: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            successRate: ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1) + '%'
          },
          capturedData: {
            current: Array.from(curData.entries()).reduce((obj, [key, value]) => {
              obj[key] = value;
              return obj;
            }, {} as Record<string, any>),
            new: Array.from(newData.entries()).reduce((obj, [key, value]) => {
              obj[key] = value;
              return obj;
            }, {} as Record<string, any>)
          }
        };
        
        // 結果をJSONファイルに保存
        fs.writeFileSync(comparisonResultFile, JSON.stringify(comparisonReport, null, 2));
        console.log(`💾 Comparison results saved to: ${comparisonResultFile}`);

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