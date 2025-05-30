# 🎵 Discord 音樂機器人部署指南

本指南將協助您將Discord音樂機器人部署到各種雲端平台。

## 🚀 快速開始

### 前置需求
- Node.js 18.x 或更高版本
- Discord 機器人令牌
- 已配置的 `config.js` 文件

### 自動化部署
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🌐 支援的部署平台

### 1. Railway.app (推薦) - 免費額度
**優點**: 簡單部署、自動擴容、免費額度充足
**適合**: 新手用戶

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 初始化專案
railway init

# 部署
railway up
```

**環境變數設定**:
1. 進入 Railway 控制台
2. 選擇您的專案
3. 進入 Variables 頁面
4. 添加必要的環境變數

### 2. Render.com - 免費額度
**優點**: 完全免費、簡單易用
**缺點**: 可能有休眠機制

1. 將代碼推送到 GitHub
2. 連接 Render 帳戶到 GitHub
3. 創建新的 Web Service
4. 選擇您的 repository
5. 使用以下設定:
   - Build Command: `npm install`
   - Start Command: `node index.js`

### 3. Heroku - 付費平台
**注意**: Heroku 已取消免費方案

```bash
# 安裝 Heroku CLI
# 登入
heroku login

# 創建應用
heroku create your-bot-name

# 部署
git push heroku main

# 設定環境變數
heroku config:set NODE_ENV=production
```

### 4. DigitalOcean App Platform - 付費平台
1. 登入 DigitalOcean 控制台
2. 創建新的 App
3. 連接您的 GitHub repository
4. 使用提供的 `.do/app.yaml` 配置

### 5. Fly.io - 免費額度
```bash
# 安裝 Fly CLI
# 登入
fly auth login

# 初始化
fly launch

# 部署
fly deploy
```

## 🐳 Docker 部署

### 本地 Docker 運行
```bash
# 建構映像
docker build -t discord-music-bot .

# 運行容器
docker run -d --name discord-bot discord-music-bot
```

### Docker Compose
```bash
# 啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止
docker-compose down
```

## ⚙️ 環境變數配置

在雲端平台上，您需要設定以下環境變數：

| 變數名稱 | 說明 | 必需 |
|---------|------|------|
| `NODE_ENV` | 運行環境 (production) | 是 |
| `DISCORD_TOKEN` | Discord 機器人令牌 | 是 |
| `CLIENT_ID` | Discord 應用程式 ID | 是 |

## 🔍 故障排除

### 常見問題

**1. 機器人無法連線到 Discord**
- 檢查令牌是否正確
- 確認機器人已被邀請到伺服器
- 檢查機器人權限

**2. 音樂無法播放**
- 確認 FFmpeg 已安裝（Docker 映像已包含）
- 檢查語音頻道權限
- 確認網路連線穩定

**3. 指令無法載入**
- 檢查 deploy 腳本是否執行成功
- 確認機器人有 applications.commands 權限

### 日誌查看

**Docker Compose**:
```bash
docker-compose logs -f discord-bot
```

**Railway**:
在控制台的 Deployments 頁面查看日誌

**Render**:
在控制台的 Logs 頁面查看實時日誌

## 🔧 性能優化

### 記憶體優化
- 使用 Alpine Linux 基底映像（已配置）
- 定期清理快取和臨時文件
- 監控記憶體使用量

### 網路優化
- 選擇靠近目標用戶的伺服器區域
- 使用 CDN 加速音頻內容（如適用）

## 📊 監控和維護

### 健康檢查
Docker 映像已包含健康檢查，會定期驗證應用程式狀態。

### 自動重啟
所有配置都包含重啟策略，應用程式崩潰時會自動重啟。

### 日誌管理
- 使用結構化日誌格式
- 定期輪轉日誌文件
- 設定適當的日誌等級

## 💰 成本估算

| 平台 | 免費額度 | 付費方案 |
|------|---------|---------|
| Railway | 5美元/月 | 20美元/月起 |
| Render | 750小時/月 | 7美元/月起 |
| Fly.io | 2,340小時/月 | 按使用付費 |
| DigitalOcean | 無 | 5美元/月起 |

## 🆘 支援

如果遇到部署問題：
1. 檢查本指南的故障排除部分
2. 查看平台官方文檔
3. 檢查應用程式日誌
4. 確認所有環境變數已正確設定

## 🔐 安全建議

1. **永遠不要將令牌提交到 Git**
2. **使用環境變數儲存敏感信息**
3. **定期輪換機器人令牌**
4. **限制機器人權限到最小必要範圍**
5. **啟用 2FA 保護雲端帳戶**

---

**祝您部署順利！ 🎉** 