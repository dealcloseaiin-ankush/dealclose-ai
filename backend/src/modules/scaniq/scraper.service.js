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
    
    // Starts the Apify Actor: Instagram Scraper
    console.log(`[Scraper Debug] ⏳ Calling Apify Actor 'apify/instagram-scraper'...`);
    const run = await client.actor("apify/instagram-scraper").call({
        directUrls: [url],
        resultsType: "posts",
        resultsLimit: 1,
    });
    console.log(`[Scraper Debug] ✅ Apify Actor Run Finished. Run ID: ${run.id}. Fetching dataset...`);

    // Fetch the results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const post = items[0];

    if (!post) {
        console.log(`❌ [Scraper Debug] Error: Post not found in dataset.`);
        throw new Error('Post not found. It might be deleted or from a private account.');
    }

    console.log(`[Scraper Debug] 🎉 Post data extracted successfully! Author: ${post.ownerUsername}`);
    // Return only the data we need for the AI Prompt
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

    // Starts the Apify Actor: Facebook Ads Library Scraper
    console.log(`[Scraper Debug] ⏳ Calling Apify Actor 'drobile/facebook-ads-library-scraper'...`);
    const run = await client.actor("drobile/facebook-ads-library-scraper").call({
        searchTerms: [query],
        country: "IN", // Searching in India by default
        maxResults: 5, // Get top 5 ads
        proxy: {
            useApifyProxy: true
        }
    });
    console.log(`[Scraper Debug] ✅ Apify Actor Run Finished. Run ID: ${run.id}. Fetching dataset...`);

    // Fetch the results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
        console.log(`❌ [Scraper Debug] Error: No ads found in dataset for query "${query}".`);
        return []; // Return empty array if no ads found
    }

    console.log(`[Scraper Debug] 🎉 Found ${items.length} ads. Processing...`);
    // Return a simplified version of the data
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