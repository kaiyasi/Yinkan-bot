# 🎵 Yinkan MusicBot Deployment Guide

This guide helps you deploy **Yinkan**, a Discord music bot, to various cloud platforms.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- A valid Discord bot token
- A properly configured `config.js` file

### Auto Deployment
chmod +x deploy.sh  
./deploy.sh

---

## 🌐 Supported Platforms

### 1. Railway.app (Recommended) — Free Tier Available  
Pros: Easy setup, autoscaling, generous free tier  
Best For: Beginners

# Install Railway CLI  
npm install -g @railway/cli

# Log in  
railway login

# Initialize project  
railway init

# Deploy  
railway up

Environment Variable Setup:
1. Go to the Railway dashboard
2. Select your project
3. Navigate to "Variables"
4. Add required variables (e.g., DISCORD_TOKEN, CLIENT_ID)

---

### 2. Render.com — Free Tier  
Pros: 100% free, beginner-friendly  
Cons: May sleep after inactivity

Steps:
1. Push your code to GitHub
2. Connect Render to GitHub
3. Create a new Web Service
4. Select your repository
5. Set:
   - Build Command: npm install
   - Start Command: node index.js

---

### 3. Heroku — Paid Only  
⚠️ Free plans have been discontinued.

# Install Heroku CLI  
# Login  
heroku login

# Create your app  
heroku create your-bot-name

# Deploy to Heroku  
git push heroku main

# Set environment variables  
heroku config:set NODE_ENV=production

---

### 4. DigitalOcean App Platform — Paid  
1. Log into DigitalOcean  
2. Create a new App  
3. Connect your GitHub repository  
4. Use `.do/app.yaml` for configuration

---

### 5. Fly.io — Free Tier

# Install Fly CLI  
# Login  
fly auth login

# Launch project  
fly launch

# Deploy  
fly deploy

---

## 🐳 Docker Deployment

### Local Docker Run

# Build image  
docker build -t yinkan-music-bot .

# Run container  
docker run -d --name yinkan-bot yinkan-music-bot

### Docker Compose

# Start  
docker-compose up -d

# View logs  
docker-compose logs -f

# Stop  
docker-compose down

---

## ⚙️ Environment Variables

You must configure the following:

Variable Name     | Description                     | Required  
------------------|---------------------------------|---------  
NODE_ENV          | Environment (e.g., production)  | Yes  
DISCORD_TOKEN     | Discord bot token               | Yes  
CLIENT_ID         | Discord Application ID          | Yes  

---

## 🔍 Troubleshooting

### Common Issues

1. **Bot can't connect to Discord**
   - Check your bot token
   - Ensure the bot is invited to your server
   - Check its permissions

2. **Music won't play**
   - Make sure FFmpeg is installed (bundled in Docker image)
   - Check voice channel permissions
   - Confirm network connectivity

3. **Commands not loading**
   - Ensure the deploy script ran successfully
   - Check if bot has `applications.commands` permission

### Viewing Logs

- **Docker Compose**:  
  docker-compose logs -f discord-bot

- **Railway**:  
  View logs in the Deployments tab

- **Render**:  
  View real-time logs in the Logs section

---

## 🔧 Performance Optimization

### Memory
- Use Alpine-based image (already configured)
- Clean cache/temp files regularly
- Monitor memory usage

### Network
- Choose server region close to your audience
- Use a CDN for audio content if applicable

---

## 📊 Monitoring and Maintenance

- Health checks are built into the Docker image
- Auto-restart is configured on all platforms
- Logs use structured format with log rotation options

---

## 💰 Cost Estimates

Platform       | Free Tier        | Paid Plans  
---------------|------------------|-----------------  
Railway        | $5/month credit  | From $20/month  
Render         | 750 hrs/month    | From $7/month  
Fly.io         | 2,340 hrs/month  | Pay-as-you-go  
DigitalOcean   | None             | From $5/month  

---

## 🆘 Support

If you encounter issues:
1. Check this guide’s Troubleshooting section
2. Review official docs of your platform
3. Inspect application logs
4. Verify environment variables are set correctly

📬 **Contact**: zengcode0315@gmail.com

---

## 🔐 Security Tips

1. **Never commit your bot token to Git**
2. **Use environment variables for secrets**
3. **Rotate bot tokens periodically**
4. **Minimize permissions for your bot**
5. **Enable 2FA on cloud accounts**

---

Happy Deploying! 🎉
