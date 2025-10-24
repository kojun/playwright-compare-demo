# 1) 依存インストール＆ビルド（ホスト）
# ローカルで一度だけ実行。
# コンテナ内でapk/npmを走らせるとnetskopeの証明書問題に邪魔されるため、ローカルで実行する。
cd server
npm install # 必要なら一時的に npm config set strict-ssl false

# 2) コードを変えたらここから実行。
npm run build
# EJSを実行ディレクトリに同梱
cp -r src/views dist/views
cd ..
docker compose build

# 3) Docker起動
docker compose up -d
# 起動後: CUR = http://localhost:3001, NEW = http://localhost:3002

# 4) Playwright 依存の用意（テスト直下）（初回のみ）
npm -v || brew install node # Nodeがなければ
npm init -y
npm i -D @playwright/test pg
npx playwright install

# 5) テスト実行
npx playwright test tests/example-view.spec.ts
npx playwright test tests/example-crud.spec.ts
npx playwright show-report
