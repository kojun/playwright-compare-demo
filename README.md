# Playwright compareデモ
- バックエンド側は、現新のDB（postgresql）とアプリ（Express）をコンテナで作成。
- クライアント側は、playwrightで現新のアプリにリクエストし、アプリとDBの内容を比較。

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
cd server
npm run build
# EJSを実行ディレクトリに同梱
cp -r src/views dist/views
cd ..
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

## Playwrightテスト側

### 初回インストール
```
npm install
npx playwright install
```

### テスト実行（例）
```
npx playwright test tests/example-view.spec.ts
npx playwright test tests/example-crud.spec.ts
npx playwright show-report
```
