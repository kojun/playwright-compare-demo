// framework/dsl-engine.ts
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { SelectorEngine } from './selector-engine';
import { EnvironmentManager, Environment } from './environment-manager';
import { fetchRows, withDb } from '../tests/db.utils';
import { fetchNormalizedHTML } from '../tests/compare.utils';

export interface TestAction {
  action: string;
  target?: string;
  selector?: string;
  value?: string;
  id?: string;
  query?: string;
  description?: string;
  expectDialog?: boolean;
  accept?: boolean;
}

export interface TestStep {
  name: string;
  description: string;
  actions: TestAction[];
}

export interface Comparison {
  name: string;
  description: string;
  type: 'html' | 'database';
  source: string;
  ignorePatterns?: string[];
}

export interface ScenarioDefinition {
  name: string;
  description: string;
  setup?: TestAction[];
  steps: TestStep[];
  comparisons: Comparison[];
  testData: Record<string, any>;
}

export class DSLEngine {
  private selectorEngine: SelectorEngine;
  private environmentManager: EnvironmentManager;
  private capturedData: Map<string, any> = new Map();

  constructor(selectorEngine: SelectorEngine, environmentManager: EnvironmentManager) {
    this.selectorEngine = selectorEngine;
    this.environmentManager = environmentManager;
  }

  /**
   * YAMLファイルからシナリオを読み込み
   */
  loadScenario(scenarioPath: string): ScenarioDefinition {
    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Scenario file not found: ${scenarioPath}`);
    }

    const content = fs.readFileSync(scenarioPath, 'utf-8');
    return yaml.load(content) as ScenarioDefinition;
  }

  /**
   * シナリオを実行
   */
  async executeScenario(
    scenario: ScenarioDefinition, 
    page: Page, 
    environment: Environment
  ): Promise<Map<string, any>> {
    console.log(`🚀 Starting scenario: ${scenario.name} on ${environment.name}`);
    
    // セットアップ実行
    if (scenario.setup) {
      for (const action of scenario.setup) {
        await this.executeAction(action, page, environment, scenario.testData);
      }
    }

    // ステップ実行
    for (const step of scenario.steps) {
      console.log(`📋 Executing step: ${step.name}`);
      for (const action of step.actions) {
        await this.executeAction(action, page, environment, scenario.testData);
      }
    }

    return this.capturedData;
  }

  /**
   * 個別アクションを実行
   */
  private async executeAction(
    action: TestAction, 
    page: Page, 
    environment: Environment, 
    testData: Record<string, any>
  ): Promise<void> {
    const resolvedValue = this.resolveValue(action.value, environment, testData);

    switch (action.action) {
      case 'navigate':
        await page.goto(environment.baseUrl + (action.target || ''));
        break;

      case 'fill':
        if (!action.selector) throw new Error('selector is required for fill action');
        const fillLocator = await this.selectorEngine.getLocator(page, action.selector);
        await fillLocator.fill(resolvedValue || '');
        break;

      case 'click':
        if (!action.selector) throw new Error('selector is required for click action');
        
        // ダイアログが期待される場合のハンドラー設定
        if (action.expectDialog) {
          page.once('dialog', async dialog => {
            console.log(`Expected dialog appeared: ${dialog.message()}`);
            if (action.accept !== undefined) {
              if (action.accept) {
                console.log('Accepting dialog');
                await dialog.accept();
              } else {
                console.log('Dismissing dialog');
                await dialog.dismiss();
              }
            } else {
              await dialog.accept(); // デフォルト受諾
            }
          });
        }
        
        const clickLocator = await this.selectorEngine.getLocator(page, action.selector);
        await clickLocator.click();
        // クリック後に少し待機
        await page.waitForTimeout(500);
        break;

      case 'waitForNavigation':
        // より短いタイムアウトと安全なwait条件を使用
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        } catch (error) {
          console.warn('waitForNavigation timeout, continuing...');
        }
        break;

      case 'captureHTML':
        if (!action.id) throw new Error('id is required for captureHTML action');
        const html = await fetchNormalizedHTML(page, page.url());
        this.capturedData.set(`${action.id}_${environment.name}`, html);
        break;

      case 'captureDatabase':
        if (!action.id || !action.query) throw new Error('id and query are required for captureDatabase action');
        const dbData = await fetchRows(environment.database, action.query);
        this.capturedData.set(`${action.id}_${environment.name}`, dbData);
        break;

      case 'resetDatabase':
        await this.resetCustomersToInitialState(environment.database);
        break;

      case 'clear':
        if (!action.selector) throw new Error('selector is required for clear action');
        const clearLocator = await this.selectorEngine.getLocator(page, action.selector);
        await clearLocator.clear();
        break;

      case 'handleDialog':
        // ダイアログハンドラーを設定
        page.once('dialog', async dialog => {
          console.log(`Dialog appeared: ${dialog.message()}`);
          if (action.accept !== undefined) {
            if (action.accept) {
              console.log('Accepting dialog');
              await dialog.accept();
            } else {
              console.log('Dismissing dialog');
              await dialog.dismiss();
            }
          } else {
            // デフォルトは受諾
            await dialog.accept();
          }
        });
        break;

      default:
        console.warn(`Unknown action: ${action.action}`);
    }
  }

  /**
   * 値の解決（変数展開）
   */
  private resolveValue(
    value: string | undefined, 
    environment: Environment, 
    testData: Record<string, any>
  ): string {
    if (!value) return '';

    let resolved = value;

    // ${credentials.admin.username} のような参照を解決
    resolved = resolved.replace(/\${credentials\.(\w+)\.(\w+)}/g, (match, credKey, field) => {
      const credentials = this.environmentManager.getCredentials(credKey);
      return credentials[field as keyof typeof credentials] || match;
    });

    // ${testData.customer.name} のような参照を解決
    resolved = resolved.replace(/\${testData\.([^}]+)}/g, (match, path) => {
      const keys = path.split('.');
      let current: any = testData;
      for (const key of keys) {
        current = current?.[key];
      }
      return current || match;
    });

    // ${timestamp} を現在のタイムスタンプに置換
    resolved = resolved.replace(/\${timestamp}/g, Date.now().toString());

    return resolved;
  }

  /**
   * データベースリセット
   */
  private async resetCustomersToInitialState(dbConfig: any): Promise<void> {
    await withDb(dbConfig, async (client) => {
      await client.query('DELETE FROM customers WHERE id > 2');
      await client.query('SELECT setval(\'customers_id_seq\', 2, true)');
    });
  }

  /**
   * キャプチャされたデータを取得
   */
  getCapturedData(): Map<string, any> {
    return this.capturedData;
  }
}