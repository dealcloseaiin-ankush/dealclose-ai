// backend/src/services/instagramService.js
const axios = require('axios');

/**
 * Publishes a single image post to an Instagram Business Account.
 */
exports.publishInstagramPost = async (igAccountId, accessToken, imageUrl, caption) => {
  try {
    console.log(`[IG Publish] Step 1: Uploading image container for account ${igAccountId}`);
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken,
      }
    );

    const creationId = containerResponse.data.id;
    if (!creationId) {
      throw new Error('Failed to create media container.');
    }
    console.log(`[IG Publish] Step 1 Success: Got container ID: ${creationId}`);

    console.log(`[IG Publish] Step 2: Publishing container ${creationId}`);
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );
    
    console.log(`[IG Publish] Step 2 Success: Post published with ID: ${publishResponse.data.id}`);
    return { success: true, postId: publishResponse.data.id };

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`[IG Publish] Error publishing to Instagram:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * 🚀 UPGRADED: Publishes Reels or Images directly with Status Processing Loops
 * (Used by AI Video Dashboard & Pipelines)
 */
exports.publishInstagramMedia = async (igAccountId, accessToken, mediaUrl, mediaType, caption) => {
  try {
    console.log(`[IG Publish] Step 1: Uploading ${mediaType} container for account ${igAccountId}`);
    
    const payload = {
      caption: caption,
      access_token: accessToken,
    };

    const isVideo = mediaType === 'video' || mediaType === 'avatar_video';

    if (isVideo) {
      payload.media_type = 'REELS';
      payload.video_url = mediaUrl;
    } else {
      payload.image_url = mediaUrl;
    }

    const containerResponse = await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/media`, payload);
    const creationId = containerResponse.data.id;
    console.log(`[IG Publish] Step 1 Success: Got container ID: ${creationId}`);

    // 🚀 CRITICAL REELS BUG FIX: Video container processing status check pool loop
    if (isVideo) {
      console.log(`⏳ [IG Publish] Video detected. Checking container processing status before publishing...`);
      let isReady = false;
      let retries = 0;
      
      while (!isReady && retries < 10) {
        // Wait 5 seconds between every status request check
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          const statusCheck = await axios.get(`https://graph.facebook.com/v19.0/${creationId}`, {
            params: { fields: 'status_code', access_token: accessToken }
          });
          
          const status = statusCheck.data?.status_code;
          console.log(`   👉 Container ${creationId} Current Processing Status: ${status}`);
          
          if (status === 'FINISHED') {
            isReady = true;
            console.log(`✅ [IG Publish] Container is completely ready for publishing!`);
          } else if (status === 'ERROR') {
            throw new Error("Meta processing failed with ERROR state inside media container.");
          }
        } catch (statusErr) {
          console.warn("⚠️ Retrying status polling check...", statusErr.message);
        }
        retries++;
      }
    }

    console.log(`[IG Publish] Step 2: Publishing container ${creationId}`);
    const publishResponse = await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    
    console.log(`[IG Publish] Step 2 Success: Media published with ID: ${publishResponse.data.id}`);
    return { success: true, postId: publishResponse.data.id };

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`[IG Publish] Error publishing media:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * 🚀 UPGRADED: Fetches existing posts/reels from Meta to display in templates dropdown with safe dynamic array fallback
 */
exports.fetchRecentPosts = async (igAccountId, accessToken, limit = 12) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,comments_count,like_count',
          limit: limit,
          access_token: accessToken
        }
      }
    );
    return response.data?.data || [];
  } catch (error) {
    console.error("❌ Meta Graph API Posts Fetch Error:", error.response?.data?.error?.message || error.message);
    throw error;
  }
};

/** Fetches public comments for one Instagram media item. */
exports.getCommentsForPost = async (mediaId, accessToken) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}/comments`, {
      params: {
        fields: 'id,text,username,timestamp,like_count,replies{id,text,username,timestamp}',
        access_token: accessToken,
      },
    });
    return response.data?.data || [];
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/** Replies publicly to an Instagram comment. */
exports.replyToComment = async (commentId, accessToken, message) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${commentId}/replies`,
      { message, access_token: accessToken }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * 🚀 NEW: Fetches performance insights for a specific Instagram post/reel.
 * @param {string} mediaId - The ID of the Instagram post or reel.
 * @param {string} accessToken - The user's Instagram access token.
 * @returns {Promise<object>} - An object containing the insights data.
 */
exports.getPostInsights = async (mediaId, accessToken) => {
  try {
    // Ye metrics hum Meta se maang rahe hain
    const metrics = 'impressions,reach,saved,video_views,likes,comments';
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: metrics,
        access_token: accessToken,
      },
    });

    // API se mile data ko saaf format me return karein
    const insights = {};
    response.data.data.forEach(metric => {
      insights[metric.name] = metric.values[0].value;
    });

    return insights;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * 🚀 NEW: Fetches key business insights for an Instagram account.
 * @param {string} igAccountId - The user's Instagram Business Account ID.
 * @param {string} accessToken - The user's Instagram access token.
 * @returns {Promise<object>} - An object containing the insights data.
 */
exports.getBusinessInsights = async (igAccountId, accessToken) => {
  try {
    // Metrics we want for the last day
    const dailyMetrics = 'reach,impressions,profile_views,website_clicks,accounts_engaged_count';
    const lifetimeMetrics = 'follower_count';

    const insightsUrl = `https://graph.facebook.com/v19.0/${igAccountId}/insights`;

    // Make two parallel API calls for efficiency
    const [dailyResponse, lifetimeResponse] = await Promise.all([
      axios.get(insightsUrl, {
        params: { metric: dailyMetrics, period: 'day', access_token: accessToken },
      }),
      axios.get(insightsUrl, {
        params: { metric: lifetimeMetrics, period: 'lifetime', access_token: accessToken },
      }),
    ]);

    const insights = {
      last_updated: new Date().toISOString(),
    };

    // Process and format the results from both calls
    const allMetrics = [...dailyResponse.data.data, ...lifetimeResponse.data.data];

    allMetrics.forEach(metric => {
      // Use the last value in the values array
      insights[metric.name] = metric.values.slice(-1)[0].value;
    });

    return insights;
  } catch (error) {
    console.error("❌ Meta Graph API Business Insights Fetch Error:", error.response?.data?.error?.message || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch Instagram Insights.');
  }
};

/**
 * Sends a direct message to an Instagram user.
 * @param {string} recipientId - The Instagram-scoped ID of the user.
 * @param {string} message - The text message to send.
 * @param {string} pageAccessToken - The access token of the Facebook Page linked to the IG account.
 * @returns {Promise<object>} The response from the Graph API.
 */
exports.sendDirectMessage = async (recipientId, message, pageAccessToken) => {
  try {
    const url = `https://graph.facebook.com/v19.0/me/messages`;
    const response = await axios.post(url, 
      {
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: 'RESPONSE'
      },
      { params: { access_token: pageAccessToken } }
    );
    return response.data;
  } catch (error) {
    console.error('Graph API Error sending DM:', error.response?.data?.error);
    throw new Error(error.response?.data?.error?.message || 'Failed to send direct message via Instagram.');
  }
};

/**
 * 🚀 NEW: Fetches performance insights for a specific Instagram post/reel.
 * @param {string} mediaId - The ID of the Instagram post or reel.
 * @param {string} accessToken - The user's Instagram access token.
 * @returns {Promise<object>} - An object containing the insights data.
 */
exports.getPostInsights = async (mediaId, accessToken) => {
  try {
    // Ye metrics hum Meta se maang rahe hain
    const metrics = 'impressions,reach,saved,video_views,likes,comments';
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: metrics,
        access_token: accessToken,
      },
    });

    // API se mile data ko saaf format me return karein
    const insights = {};
    response.data.data.forEach(metric => {
      insights[metric.name] = metric.values[0].value;
    });

    return insights;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * 🚀 NEW: Fetches key business insights for an Instagram account.
 * @param {string} igAccountId - The user's Instagram Business Account ID.
 * @param {string} accessToken - The user's Instagram access token.
 * @returns {Promise<object>} - An object containing the insights data.
 */
exports.getBusinessInsights = async (igAccountId, accessToken) => {
  try {
    const metrics = 'reach,impressions,profile_views,follower_count,accounts_engaged_count';
    const url = `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=${metrics}&period=day&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data.data;
  } catch (error) {
    console.error("❌ Meta Graph API Business Insights Fetch Error:", error.response?.data?.error?.message || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch Instagram Insights.');
  }
};

/**
 * 🚀 NEW & ROBUST: Publishes a single image post with container status check.
 * @param {string} igAccountId - The user's Instagram Business Account ID.
 * @param {string} accessToken - The user's Instagram access token.
 * @param {string} imageUrl - The public URL of the image to post.
 * @param {string} caption - The caption for the post.
 * @returns {Promise<object>} - An object containing the success status and post ID.
 */
exports.publishImagePost = async (igAccountId, accessToken, imageUrl, caption) => {
  try {
    console.log(`[IG Publish] Step 1: Creating media container for image.`);
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      { image_url: imageUrl, caption: caption, access_token: accessToken }
    );

    const creationId = containerResponse.data.id;
    if (!creationId) throw new Error('Failed to create media container.');
    console.log(`[IG Publish] Step 1 Success: Got container ID: ${creationId}`);

    // 🚀 CRITICAL: Check container processing status before publishing.
    console.log(`⏳ [IG Publish] Checking container processing status...`);
    let isReady = false;
    for (let i = 0; i < 10; i++) { // Retry up to 10 times (50 seconds)
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      const statusCheck = await axios.get(`https://graph.facebook.com/v19.0/${creationId}`, {
        params: { fields: 'status_code', access_token: accessToken }
      });
      const status = statusCheck.data?.status_code;
      console.log(`   👉 Container ${creationId} Status: ${status}`);
      if (status === 'FINISHED') {
        isReady = true;
        break;
      }
      if (status === 'ERROR') throw new Error("Meta failed to process the image container.");
    }

    if (!isReady) throw new Error("Media container processing timed out.");

    console.log(`[IG Publish] Step 2: Publishing container ${creationId}`);
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      { creation_id: creationId, access_token: accessToken }
    );
    
    return { success: true, postId: publishResponse.data.id };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    // ✅ NEW: Provide a user-friendly error message for the most common permission issue.
    if (errorMessage.includes('Requires instagram_content_publish permission')) {
      throw new Error('Permission to publish content is missing. Please reconnect your Instagram account in Settings and grant all permissions.');
    }
    console.error(`[IG Publish] Error publishing to Instagram:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/** Publishes a photo to the connected Facebook Page using its Page access token. */
exports.publishFacebookPhoto = async (pageId, accessToken, imageUrl, caption) => {
  try {
    const response = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      url: imageUrl,
      caption,
      access_token: accessToken,
    });
    const postId = response.data?.post_id || response.data?.id;
    if (!postId) throw new Error('Facebook did not return a post ID.');
    return { success: true, postId };
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};
