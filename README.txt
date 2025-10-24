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
docker compose up -d --build    # --buildが必要なのは変更があったときのみ。通常は docker compose up -d でOK。
# 起動後: CUR = http://localhost:3001, NEW = http://localhost:3002

# 3) Playwright 依存の用意（テスト直下）
npm -v || brew install node # Nodeがなければ
npm init -y
npm i -D @playwright/test pg
npx playwright install

# 4) テスト実行
npx playwright test tests/example-view.spec.ts
npx playwright test tests/example-crud.spec.ts
npx playwright show-report
