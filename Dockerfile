# 使用官方 Node.js 運行時作為基底鏡像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 安裝 ffmpeg（音頻處理必需）
RUN apk add --no-cache ffmpeg

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production && npm cache clean --force

# 複製應用程式碼
COPY . .

# 創建必要的目錄
RUN mkdir -p data logs

# 設定環境變數
ENV NODE_ENV=production

# 暴露端口（如果需要API）
EXPOSE 3000

# 啟動應用
CMD ["node", "index.js"]
