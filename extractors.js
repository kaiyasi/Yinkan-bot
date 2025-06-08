// 增強型 YouTube 提取器，添加更多錯誤處理和備用方法

const { stream, video_info, yt_validate } = require('play-dl');
const { Extractor } = require('discord-player');

class EnhancedYouTubeExtractor extends Extractor {
  constructor() {
    super();
    this.identifier = 'enhanced-youtube-extractor';
    this.label = '增強型 YouTube 提取器';
    
    // 添加一個計數器來追蹤成功率
    this.successCount = 0;
    this.totalCount = 0;
  }

  // 驗證 YouTube URL
  async validate(query) {
    try {
      if (typeof query !== 'string') return false;
      
      // 僅匹配明確的 YouTube URL 格式
      const isYoutubeUrl = query.includes('youtube.com/watch') || 
                           query.includes('youtu.be/') || 
                           (yt_validate && yt_validate(query) === 'video');
                           
      if (isYoutubeUrl) {
        console.log(`✓ ${this.identifier}: URL 格式有效: ${query}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('YouTube URL 驗證錯誤:', error);
      return false;
    }
  }

  // 用於 YouTube 播放的數據提取
  async createExtractor(query, options) {
    this.totalCount++;
    
    try {
      console.log(`🔍 ${this.identifier}: 處理 URL: ${query}`);
      
      // 標準化 URL 格式
      let processedUrl = query;
      if (query.includes('youtube.com/watch')) {
        const videoId = query.match(/v=([^&]+)/)?.[1];
        if (videoId) {
          processedUrl = `https://youtu.be/${videoId}`;
          console.log(`URL 已標準化: ${processedUrl}`);
        }
      }
      
      // 檢查是否為有效的 YouTube URL
      if (!await this.validate(processedUrl)) {
        throw new Error('無效的 YouTube URL 格式');
      }

      // 添加延遲，避免太快發送請求被 API 限制
      await new Promise(r => setTimeout(r, 100));
      
      // 嘗試獲取視頻資訊
      console.log('正在獲取視頻資訊...');
      const videoInfo = await video_info(processedUrl);
      
      if (!videoInfo) {
        throw new Error('無法獲取影片資訊');
      }
      
      // 檢查影片是否可播放
      if (videoInfo.video_details.private) {
        throw new Error('此影片已設為私人或無法播放');
      }

      console.log('視頻信息獲取成功，準備音訊串流...');
      
      // 獲取音訊流
      const streamData = await stream(processedUrl, { 
        quality: 0,
        discordPlayerCompatibility: true
      });
      
      this.successCount++;
      
      console.log(`✅ ${this.identifier}: 提取成功 (成功率: ${this.successCount}/${this.totalCount})`);
      
      // 返回結果
      return {
        stream: streamData.stream,
        metadata: {
          title: videoInfo.video_details.title || '未知標題',
          description: videoInfo.video_details.description?.substring(0, 500) || '',
          url: processedUrl,
          thumbnail: videoInfo.video_details.thumbnails?.[0]?.url || '',
          duration: videoInfo.video_details.durationInSec * 1000 || 0,
          views: videoInfo.video_details.views || 0,
          author: {
            name: videoInfo.video_details.channel?.name || '未知作者',
            url: videoInfo.video_details.channel?.url || ''
          },
          source: 'youtube',
          engine: this.identifier,
          raw: {
            kind: 'youtube#video'
          }
        },
        playbackOptions: {
          seek: 0,
          volume: 100
        }
      };
    } catch (error) {
      console.error(`❌ ${this.identifier} 提取失敗:`, error);
      throw new Error(`YouTube 影片提取失敗: ${error.message}`);
    }
  }
  
  async stream(query, options) {
    try {
      const extraction = await this.createExtractor(query, options);
      return extraction.stream;
    } catch (error) {
      console.error(`❌ ${this.identifier} 流提取失敗:`, error);
      throw error;
    }
  }
}

module.exports = { EnhancedYouTubeExtractor };