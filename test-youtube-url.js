// 測試 YouTube URL 解析邏輯
const testUrls = [
  'https://www.youtube.com/watch?v=kVnecr5a1Sc',
  'https://www.youtube.com/watch?v=kVnecr5a1Sc&list=PLrDd_kMiAuNmSb-CKWQqBA0zMIveCZ2x9',
  'https://youtu.be/kVnecr5a1Sc',
  'https://youtu.be/kVnecr5a1Sc?t=60',
  'https://www.youtube.com/embed/kVnecr5a1Sc',
  'https://music.youtube.com/watch?v=kVnecr5a1Sc',
  'normal search query'
];

console.log('測試 YouTube URL 解析邏輯：\n');

testUrls.forEach(song => {
  // 檢查是否為 YouTube URL（支援多種格式）
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = song.match(youtubeRegex);
  
  let finalSong = song;
  let useYouTubeExtractor = false;
  
  if (youtubeMatch && youtubeMatch[1]) {
    useYouTubeExtractor = true;
    const videoId = youtubeMatch[1];
    
    // 重構為乾淨的 YouTube URL，確保沒有額外參數
    finalSong = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`✅ ${song}`);
    console.log(`   -> ${finalSong} (視頻 ID: ${videoId})`);
  } else if (song.includes('youtube.com') || song.includes('youtu.be')) {
    // 如果看起來像 YouTube URL 但無法提取 ID，記錄並繼續處理
    console.log(`⚠️  ${song}`);
    console.log(`   -> 疑似 YouTube URL 但無法提取視頻 ID`);
    useYouTubeExtractor = true; // 仍然嘗試 YouTube 特定處理
  } else {
    console.log(`➡️  ${song}`);
    console.log(`   -> 一般搜索查詢`);
  }
  
  console.log(`   使用 YouTube 提取器: ${useYouTubeExtractor}\n`);
});
