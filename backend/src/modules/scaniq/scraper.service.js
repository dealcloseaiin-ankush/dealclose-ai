const { ApifyClient } = require('apify-client');

// Initialize the ApifyClient with your API token from the .env file
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN || 'DUMMY_TOKEN_PLEASE_ADD_TO_ENV',
});

exports.scrape = async (url, platform) => {
    if (platform === 'instagram') return exports.scrapeInstagram(url);
    
    // For Phase 1 MVP, we only fully support Instagram URLs
    throw new Error(`${platform} URL scraping is coming soon. Please use screenshot upload.`);
};

exports.scrapeInstagram = async (url) => {
    console.log(`\n[Scraper Debug] 🕷️ Extracting data from Instagram URL: ${url}`);
    
    console.log(`[Scraper Debug] ⏳ Calling Apify Actor 'apify/instagram-scraper'...`);
    const run = await client.actor("apify/instagram-scraper").call({
        directUrls: [url],
        resultsType: "posts",
        resultsLimit: 1,
    });
    console.log(`[Scraper Debug] ✅ Apify Actor Run Finished. Run ID: ${run.id}. Fetching dataset...`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const post = items[0];

    if (!post) {
        console.log(`❌ [Scraper Debug] Error: Post not found in dataset.`);
        throw new Error('Post not found. It might be deleted or from a private account.');
    }

    console.log(`[Scraper Debug] 🎉 Post data extracted successfully! Author: ${post.ownerUsername}`);
    return {
        caption: post.caption || '',
        hashtags: post.hashtags || [],
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        views: post.videoViewCount || 0,
        thumbnailUrl: post.displayUrl || post.imageUrl,
        postedAt: post.timestamp,
        authorUsername: post.ownerUsername,
    };
};

exports.scrapeFacebookAds = async (query) => {
    console.log(`\n[Scraper Debug] 🕷️ Scraping Facebook Ad Library for query: "${query}"`);

    console.log(`[Scraper Debug] ⏳ Calling Apify Actor 'drobile/facebook-ads-library-scraper'...`);
    const run = await client.actor("drobile/facebook-ads-library-scraper").call({
        searchTerms: [query],
        country: "IN", // Searching in India by default
        maxResults: 3 // Reduced to 3 to make it faster and removed proxy block
    });
    console.log(`[Scraper Debug] ✅ Apify Actor Run Finished. Run ID: ${run.id}. Fetching dataset...`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // 🔍 BUG 3 DEBUG LOG: Ye temporarily add kiya hai taaki hum dekh sakein
    // Apify actor asal mein kaunse field names return kar raha hai.
    // Server logs check karo aur dekho pageName/adText/adSnapshotUrl exist
    // karte hain ya undefined aate hain. Test hone ke baad ye line hata sakte ho.
    console.log(`[DEBUG - Bug 3 Check] Raw first item:`, JSON.stringify(items[0], null, 2));

    if (!items || items.length === 0) {
        console.log(`❌ [Scraper Debug] Error: No ads found in dataset for query "${query}".`);
        return [];
    }

    console.log(`[Scraper Debug] 🎉 Found ${items.length} ads. Processing...`);
    return items.map(ad => ({
        pageName: ad.pageName,
        adText: ad.adText,
        adLink: ad.adSnapshotUrl,
        imageUrl: ad.images?.[0]?.original_image_url || null,
        videoUrl: ad.videos?.[0]?.video_url || null,
        impressions: ad.impressionsMin,
        startedRunning: ad.startDate
    }));
};