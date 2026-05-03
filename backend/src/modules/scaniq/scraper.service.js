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
    console.log(`[Scraper] Extracting data from Instagram URL: ${url}`);
    
    // Starts the Apify Actor: Instagram Scraper
    const run = await client.actor("apify/instagram-scraper").call({
        directUrls: [url],
        resultsType: "posts",
        resultsLimit: 1,
    });

    // Fetch the results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const post = items[0];

    if (!post) {
        throw new Error('Post not found. It might be deleted or from a private account.');
    }

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