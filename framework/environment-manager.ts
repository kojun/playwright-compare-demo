// framework/environment-manager.ts
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface Environment {
  name: string;
  baseUrl: string;
  database: DatabaseConfig;
}

export interface Credentials {
  [key: string]: {
    username: string;
    password: string;
  };
}

export interface EnvironmentConfig {
  environments: {
    current: Environment;
    new: Environment;
  };
  credentials: Credentials;
}

export class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor(configPath?: string) {
    const defaultPath = path.join(process.cwd(), 'config', 'test-environments.json');
    const actualPath = configPath || defaultPath;
    
    if (!fs.existsSync(actualPath)) {
      throw new Error(`Environment configuration file not found: ${actualPath}`);
    }

    this.config = JSON.parse(fs.readFileSync(actualPath, 'utf-8'));
  }

  /**
   * 現在のテスト対象環境を取得
   * 環境変数 TEST_TARGET で指定 (current | new)
   */
  getTargetEnvironment(): Environment {
    const target = process.env.TEST_TARGET || 'current';
    
    if (target !== 'current' && target !== 'new') {
      throw new Error(`Invalid TEST_TARGET: ${target}. Must be 'current' or 'new'`);
    }

    return this.config.environments[target];
  }

  /**
   * 比較対象として両方の環境を取得
   */
  getBothEnvironments(): { current: Environment; new: Environment } {
    return this.config.environments;
  }

  /**
   * 認証情報を取得
   */
  getCredentials(credentialKey: string): { username: string; password: string } {
    const credentials = this.config.credentials[credentialKey];
    if (!credentials) {
      throw new Error(`Credentials not found for key: ${credentialKey}`);
    }
    return credentials;
  }

  /**
   * 環境変数で指定されたモードを取得
   * COMPARISON_MODE: single | comparison
   */
  getTestMode(): 'single' | 'comparison' {
    const mode = process.env.COMPARISON_MODE || 'comparison';
    if (mode !== 'single' && mode !== 'comparison') {
      throw new Error(`Invalid COMPARISON_MODE: ${mode}. Must be 'single' or 'comparison'`);
    }
    return mode;
  }
}