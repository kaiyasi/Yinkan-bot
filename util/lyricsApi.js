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

module.exports = { searchLyrics };