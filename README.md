以下是完整、最終版的 **Yinkan MusicBot 部署指南 (README)**，已全程依照你 Numora/Serelix 系列風格重構，段落、語氣、Emoji、連結統一，全文件可直接放上 GitHub。

---

# 🎵 Yinkan MusicBot - 智能音樂機器人部署指南

> **由 Serelix Studio 開發的跨平台音樂機器人，結合智慧推薦、情境感知與即時歌詞顯示，打造沉浸式的聆聽體驗。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node.js-v18+-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14+-blue.svg)](https://discord.js.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat\&logo=docker\&logoColor=white)](https://www.docker.com/)

---

## :dart: 專案特色

Yinkan 是一款 **智慧化音樂播放與管理機器人**，可在 Discord 中提供動態播放、即時歌詞與 AI 推薦功能。

### :sparkles: 核心概念

* **:notes: 智慧推薦**：根據播放歷史與使用情境動態生成播放清單。
* **:control_knobs: 多平台整合**：支援 Discord 與多音源串流（YouTube、Spotify、SoundCloud）。
* **:microphone: 即時歌詞顯示**：自動同步當前播放曲目的時間軸歌詞。
* **:robot: 自動化管理**：提供 /slash 指令控制播放、清單與隊列管理。
* **:shield: 稳定可靠**：支援 Docker、Railway、Render 等多雲部署架構。

---

## ⚙️ 環境需求

| 項目                | 最低需求 | 建議版本    |
| ----------------- | ---- | ------- |
| **Node.js**       | 18.x | 20.x    |
| **NPM / PNPM**    | 任意   | 建議 PNPM |
| **Discord Token** | 必填   | -       |
| **FFmpeg**        | 必須   | 最新版本    |

---

## 🧩 環境變數設定

| 變數名             | 說明                            | 是否必填 |
| --------------- | ----------------------------- | ---- |
| `DISCORD_TOKEN` | Discord Bot Token             | ✅    |
| `CLIENT_ID`     | Discord Application Client ID | ✅    |
| `NODE_ENV`      | `production` 或 `development`  | 建議   |
| `GUILD_ID`      | 測試伺服器 ID（開發期）                 | 選填   |

```bash
cp .env.example .env
# 編輯 .env 填入上述變數
```

---

## 🌐 部署方式

### 1️⃣ Railway（推薦）

**優點**：自動部署、免費額度、操作簡單

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

> Railway 專案頁 → Variables → 新增：
>
> * DISCORD_TOKEN
> * CLIENT_ID
> * NODE_ENV=production

---

### 2️⃣ Render（免費層）

**優點**：免命令行，支援自動更新
**缺點**：閒置會休眠

**步驟：**

1. Push 專案至 GitHub
2. Render 建立新 Web Service
3. 設定：

   * Build: `npm install`
   * Start: `node index.js`
4. 新增環境變數

---

### 3️⃣ Fly.io（有免費額度）

```bash
fly auth login
fly launch
fly deploy
fly secrets set DISCORD_TOKEN=xxxxx CLIENT_ID=xxxxx NODE_ENV=production
```

> 適合長期運作的 Discord Bot（支援 Auto-Restart 與多區節點）。

---

### 4️⃣ Heroku（付費）

```bash
heroku login
heroku create your-bot-name
git push heroku main
heroku config:set DISCORD_TOKEN=xxxxx CLIENT_ID=xxxxx NODE_ENV=production
```

---

### 5️⃣ DigitalOcean App Platform（付費）

1. 連接 GitHub
2. 指定 Node.js 環境
3. 設定 Build 與 Start 指令
4. 新增環境變數
5. 可使用 `.do/app.yaml` 自動化設定

---

## 🐳 Docker 部署

### 建立映像

```bash
docker build -t yinkan-music-bot .
```

### 執行容器

```bash
docker run -d --name yinkan-bot \
  -e DISCORD_TOKEN=xxxxx \
  -e CLIENT_ID=xxxxx \
  -e NODE_ENV=production \
  yinkan-music-bot
```

### Docker Compose

```yaml
version: "3.8"
services:
  bot:
    build: .
    container_name: yinkan-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - CLIENT_ID=${CLIENT_ID}
      - NODE_ENV=production
```

```bash
docker compose up -d
docker compose logs -f
```

---

## 🎯 Slash 指令註冊

開發期可用 **Guild 註冊** 即時同步指令。

```bash
node scripts/register-commands.js --guild $GUILD_ID
# 或全域註冊（需等待發佈）
node scripts/register-commands.js --global
```

---

## 🔍 疑難排解

| 問題       | 可能原因             | 解法                                 |
| -------- | ---------------- | ---------------------------------- |
| Bot 無法上線 | Token 錯誤、權限不足    | 重新檢查 `.env` 並重新邀請                  |
| 無法播放音樂   | 缺少 FFmpeg        | 安裝 FFmpeg 或確認 PATH                 |
| 指令沒出現    | 未註冊 / 未授權 scope  | 確保包含 `applications.commands` scope |
| 無法連接語音頻道 | 權限不足或 Intents 錯誤 | 開啟 `Voice` 權限與必要 Intents           |

**查看日誌：**

```bash
docker compose logs -f yinkan-bot
# 或 Railway / Render 的後台 Logs
```

---

## 🔧 效能與最佳化

* 使用 **Alpine** 映像縮小體積
* 自動清除暫存、鎖定依賴版本
* 將伺服器部署於主要用戶所在區域
* 若使用遠端音源，可配置 CDN 或 Cache

---

## 📊 維運與監控

* 啟用 Auto-Restart / Health Check
* 結構化日誌輸出（JSON 或簡易格式）
* 可定期自動重啟或檢查 Token 有效性

---

## 💰 成本一覽

| 平台               | 免費額度          | 付費方案起點    |
| ---------------- | ------------- | --------- |
| **Railway**      | $5/月信用額度      | $20/月起    |
| **Render**       | 750 小時/月      | $7/月起     |
| **Fly.io**       | 免費層含 2 CPU 小時 | 按用量計費     |
| **DigitalOcean** | 無             | $5/月起     |
| **Heroku**       | 無             | 依 Dyno 類型 |

---

## 🔐 安全建議

1. 不要將 Token 寫入 Git
2. 一律使用環境變數或 Secret 管理
3. 定期輪替 Token
4. 最小化權限配置
5. 啟用 2FA

---

## 🆘 支援與聯繫

### :bug: 問題回報與建議

* **:octocat: GitHub Issues** → [問題回報](https://github.com/kaiyasi/Yinkan/issues)
* **:speech_balloon: GitHub Discussions** → [功能討論](https://github.com/kaiyasi/Yinkan/discussions)

### :busts_in_silhouette: 社群交流

* **:loudspeaker: 官方 Discord 群組** → [SerelixStudio_Discord](https://discord.gg/eRfGKepusP)
* **:camera_with_flash: 官方 IG** → [Serelix Studio IG](https://www.instagram.com/serelix_studio?igsh=eGM1anl3em1xaHZ6&utm_source=qr)
* **:e_mail: 官方 Gmail** → [serelixstudio@gmail.com](mailto:serelixstudio@gmail.com)

---

### :handshake: 如何貢獻

1. :fork_and_knife: **Fork 專案**
2. :herb: **建立功能分支** → `git checkout -b feature/amazing-feature`
3. :white_check_mark: **提交變更** → `git commit -m 'Add amazing feature'`
4. :arrow_up: **推送分支** → `git push origin feature/amazing-feature`
5. :arrow_right: **開啟 Pull Request**

---

## :chart_with_upwards_trend: 專案統計

![GitHub stars](https://img.shields.io/github/stars/kaiyasi/Yinkan?style=social)
![GitHub forks](https://img.shields.io/github/forks/kaiyasi/Yinkan?style=social)
![GitHub issues](https://img.shields.io/github/issues/kaiyasi/Yinkan)
![GitHub pull requests](https://img.shields.io/github/issues-pr/kaiyasi/Yinkan)

---

*Yinkan by Serelix Studio — 智慧音樂機器人平台 🎧 讓節奏流動，讓音樂更智慧。*
