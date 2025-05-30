#!/bin/bash

# Discord 音樂機器人自動化部署腳本
# 支援多種雲平台部署

set -e

echo "🎵 Discord 音樂機器人部署工具"
echo "=================================="

# 檢查必要文件
if [ ! -f "config.js" ]; then
    echo "❌ 錯誤: 找不到 config.js 文件"
    echo "請確保已正確配置機器人令牌和其他設定"
    exit 1
fi

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ 錯誤: Docker 未安裝"
    echo "請先安裝 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "🔧 開始構建 Docker 映像..."
docker build -t discord-music-bot:latest .

echo "✅ Docker 映像構建完成"

echo ""
echo "🚀 部署選項:"
echo "1. 本地運行 (Docker)"
echo "2. Railway.app"
echo "3. Heroku"
echo "4. DigitalOcean"
echo "5. 生成部署文件"

read -p "請選擇部署選項 [1-5]: " choice

case $choice in
    1)
        echo "🏠 啟動本地容器..."
        docker-compose up -d
        echo "✅ 機器人已在本地啟動"
        echo "使用 'docker-compose logs -f' 查看日誌"
        ;;
    2)
        echo "🚄 Railway.app 部署"
        echo "1. 安裝 Railway CLI: npm install -g @railway/cli"
        echo "2. 運行: railway login"
        echo "3. 運行: railway init"
        echo "4. 運行: railway up"
        echo "5. 設定環境變數在 Railway 控制台"
        ;;
    3)
        echo "🟣 Heroku 部署"
        echo "已創建 Procfile"
        cat > Procfile << EOF
web: node index.js
EOF
        echo "1. 安裝 Heroku CLI"
        echo "2. 運行: heroku create your-bot-name"
        echo "3. 運行: git push heroku main"
        echo "4. 設定環境變數: heroku config:set TOKEN=your_token"
        ;;
    4)
        echo "🌊 DigitalOcean App Platform"
        cat > .do/app.yaml << EOF
name: discord-music-bot
services:
- name: bot
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: node index.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
EOF
        echo "已創建 DigitalOcean 配置文件"
        ;;
    5)
        echo "📦 生成部署文件..."
        
        # 創建 Railway 配置
        cat > railway.toml << EOF
[build]
builder = "DOCKERFILE"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
EOF

        # 創建 Render 配置
        cat > render.yaml << EOF
services:
  - type: web
    name: discord-music-bot
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
EOF

        # 創建 fly.io 配置
        cat > fly.toml << EOF
app = "discord-music-bot"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
EOF

        echo "✅ 已生成多平台部署配置文件"
        ;;
    *)
        echo "❌ 無效選擇"
        exit 1
        ;;
esac

echo ""
echo "🎯 部署完成！"
echo "📖 詳細部署指南請參考 README-DEPLOY.md" 