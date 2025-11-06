FROM node:20
WORKDIR /app

# 依存＆ビルドはホストで完了済み前提
COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY dist ./dist

# EJS は dist 側に必要
COPY src/views ./dist/views
EXPOSE 3000
CMD ["node", "dist/app.js"]
