# Playwright 現新比較テストデモ

現行システム（現）と新システム（新）の動作を自動比較するテストフレームワークのデモです。

## 概要

- **バックエンド**: 現新のDB（PostgreSQL）とアプリ（Express）をDockerコンテナで構築
- **フロントエンド**: PlaywrightでDSLベースの自動テストを実行し、現新の動作を比較
- **SSCM**: Strict Same Code Mode - 完全に同一のテストコードで現新両環境を検証

## アーキテクチャ

```
📋 YAML形式のテストDSL
      ↓
🔧 DSLエンジン（自動コード生成）
      ↓
🎭 Playwright（同一テストコード）
      ↓
🔄 現システム ←→ 新システム
      ↓
📊 自動比較・レポート生成
```

## バックエンド側(./server)

### 初期セットアップ
以下は、ホスト上で1回だけ実行。
コンテナ内でapk/npmを走らせると、社内環境ではnetskopeの証明書問題に邪魔されるため、ローカルでNode Packageを用意し、コンテナにそれを読み込ませる。

```
(cd server: npm install)
```

### ビルド
サーバ側のコードを修正した場合はここから実行。
```
(cd server; npm run build)
docker compose build
```

### コンテナ起動
```
docker compose up -d
```
起動後、アプリはCUR = http://localhost:3001, NEW = http://localhost:3002 でアクセスできるようになる。

### コンテナ終了
```
docker compose down # DBを残す場合
docker compose down -v # DBも消す場合
```

## DSLベーステストフレームワーク

### 初回インストール
```bash
npm install
npx playwright install
```

### テスト実行方法

#### 1. 現新比較テスト（推奨）
完全に同一のコードで現行・新システムの両方を実行し、結果を比較します：
```bash
npm run test:compare
```

#### 2. 単一環境でのテスト
特定の環境のみでテストを実行する場合：
```bash
# 現行システムのみ
npm run test:current

# 新システムのみ  
npm run test:new
```

#### 3. 従来のテスト実行
```bash
npm test
npm run report
```

### テストの構成

#### 設定ファイル
- `config/test-environments.json`: 環境設定（URL、DB接続情報など）
- `config/selectors.json`: セレクタ辞書（優先順位付きUI要素選択）
- `config/scenarios/scenario1.yaml`: テストシナリオ定義（DSL形式）

#### フレームワーク
- `framework/environment-manager.ts`: 環境管理（現/新の切り替え）
- `framework/selector-engine.ts`: セレクタエンジン（フォールバック機能付き）
- `framework/dsl-engine.ts`: DSL実行エンジン
- `framework/comparison-engine.ts`: 比較・レポート生成

#### テストファイル
- `tests/scenario1-dsl.spec.ts`: DSLベースの現新比較テスト

### DSLシナリオの記述方法

YAMLファイルでテストシナリオを定義します：

```yaml
name: "scenario1-login-and-create"
description: "ログインから顧客追加までの一連の流れを現新で比較する"

setup:
  - action: "resetDatabase"

steps:
  - name: "login"
    actions:
      - action: "navigate"
        target: "/"
      - action: "fill"
        selector: "login.username"
        value: "${credentials.admin.username}"
      - action: "fill"
        selector: "login.password"  
        value: "${credentials.admin.password}"
      - action: "click"
        selector: "login.loginButton"

comparisons:
  - name: "htmlComparison"
    type: "html"
    source: "pageContent"
    ignorePatterns:
      - "CUR|NEW"  # 環境名の差分は無視
```

### セレクタ辞書

優先順位付きでUI要素を定義：

```json
{
  "login": {
    "username": [
      { "type": "role", "role": "textbox", "name": "ユーザー名" },
      { "type": "css", "selector": "input[name='username']" }
    ]
  }
}
```

### 認証情報

デフォルトログイン情報:
- **ユーザー名**: `admin`  
- **パスワード**: `Demo2024!`

### SSCM (Strict Same Code Mode)

本フレームワークの核心機能：
- 現新で**完全に同一のテストコード**を実行
- 差分はセレクタ辞書・環境設定のみで吸収
- テストロジックの整合性を厳密に保証

### 実行結果例

成功時の出力例：
```
🎯 Test Mode: comparison
🔄 Starting SSCM (Strict Same Code Mode) comparison test
📝 Scenario: scenario1-login-and-create
🟦 Executing scenario on CURRENT system...
✓ Found element using role selector for login.username
✓ Found element using role selector for login.password
🟨 Executing scenario on NEW system...
✓ Found element using role selector for login.username
✓ Found element using role selector for login.password
🔍 Performing comparisons...

📊 Comparison Report
==================================================
Total comparisons: 4
✅ Passed: 4
❌ Failed: 0
Success rate: 100.0%

🎉 SSCM comparison test completed successfully
```

### トラブルシューティング

#### 1. セレクタが見つからない場合
```
✗ No working selector found for: login.username
```
→ `config/selectors.json`でセレクタ候補を追加してください

#### 2. データベース接続エラー
```
Error: connect ECONNREFUSED 127.0.0.1:5433
```
→ `docker compose ps`でコンテナが起動していることを確認してください

#### 3. タイムアウトエラー
→ `config/scenarios/*.yaml`の`waitForNavigation`を調整するか削除してください

### ファイル構成

```
📁 playwright-compare-demo/
├── 📁 config/              # 設定ファイル
│   ├── test-environments.json
│   ├── selectors.json
│   └── 📁 scenarios/
│       └── scenario1.yaml
├── 📁 framework/           # テストフレームワーク
│   ├── environment-manager.ts
│   ├── selector-engine.ts
│   ├── dsl-engine.ts
│   └── comparison-engine.ts
├── 📁 tests/              # テストスクリプト
│   ├── scenario1-dsl.spec.ts
│   ├── compare.utils.ts
│   ├── db.utils.ts
│   └── test-setup.utils.ts
├── 📁 server/             # バックエンドアプリ
└── docker-compose.yml     # インフラ構成
```
