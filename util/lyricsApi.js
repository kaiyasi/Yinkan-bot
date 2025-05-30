const lyricsFinder = require('lyrics-finder');

let fetch;
(async () => {
    fetch = (await import('node-fetch')).default;
})();

async function searchLyrics(query) {
  try {
    console.log(`🔍 搜尋歌詞: ${query}`);
    
    // 使用 lyrics-finder 來搜尋歌詞
    const lyrics = await lyricsFinder(query);
    
    if (lyrics) {
      // 清理歌曲名稱，移除常見的標籤
      const cleanTitle = query
        .replace(/\[.*?\]/g, '') // 移除 [...]
        .replace(/\(.*?\)/g, '') // 移除 (...)
        .replace(/【.*?】/g, '') // 移除 【...】
        .replace(/official|video|mv|lyric|audio/gi, '') // 移除常見標籤
        .trim();
      
      return {
        title: cleanTitle || query,
        artist: "未知歌手",
        lyrics: lyrics
      };
    }
    
    // 如果找不到歌詞，返回友好的訊息
    return {
      title: query,
      artist: "未知歌手",
      lyrics: `抱歉，找不到 "${query}" 的歌詞。\n\n可能的原因：\n• 歌曲名稱拼寫錯誤\n• 歌曲太新或太冷門\n• 歌詞資料庫中沒有此歌曲\n\n建議：\n• 嘗試使用更簡潔的歌曲名稱\n• 包含歌手名稱，例如："歌手名 - 歌曲名"`
    };

  } catch (error) {
    console.error("搜尋歌詞錯誤:", error);
    
    return {
      title: query,
      artist: "搜尋失敗",
      lyrics: `搜尋歌詞時發生錯誤：${error.message}\n\n請稍後再試，或手動搜尋歌詞。`
    };
  }
}

async function search(query) {
  // 保持向後相容性
  return await searchLyrics(query);
}

async function find(url) {
  try {
    // 從 URL 提取歌曲資訊並搜尋歌詞
    const lyrics = await lyricsFinder(url);
    
    return {
      name: "歌曲名稱",
      lyrics: lyrics || "歌詞內容暫不可用",
      icon: null
    };
  } catch (error) {
    throw new Error(`取得歌詞失敗: ${error.message}`);
  }
}

module.exports = {
  search,
  find,
  searchLyrics
};