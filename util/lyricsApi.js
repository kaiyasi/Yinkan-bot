const lyricsFinder = require('lyrics-finder');

let fetch;
(async () => {
    try {
        fetch = (await import('node-fetch')).default;
    } catch (e) {
        console.error("node-fetch is required for the lyrics command. Please install it.");
    }
})();

async function searchLyrics(query) {
    if (!fetch) {
        console.error("node-fetch is not available.");
        return null;
    }
    try {
        const response = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`);
        if (!response.ok) {
            console.error(`Lyrics API error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();

        if (data.error) {
            console.log(`Lyrics not found for: ${query}`);
            return null;
        }

        return {
            title: data.title,
            artist: data.author,
            lyrics: data.lyrics,
            thumbnail: data.thumbnail?.genius,
            url: data.links?.genius,
        };
    } catch (error) {
        console.error("Error fetching lyrics:", error);
        return null;
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