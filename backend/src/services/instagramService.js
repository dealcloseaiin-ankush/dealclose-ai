// backend/src/services/instagramService.js
const axios = require('axios');

// ✅ HELPER: Central place to check if a loginType is the "Instagram-native" flow.
const isInstagramNativeLogin = (loginType) =>
  loginType === 'instagram_basic_display' || loginType === 'instagram_business_login';

/**
 * 🚀 UPGRADED: Publishes Reels or Images directly with Status Processing Loops
 * (Used by AI Video Dashboard & Pipelines)
 */
exports.publishInstagramMedia = async (igAccountId, accessToken, mediaUrl, mediaType, caption, loginType = 'facebook_business') => {
  try {
    console.log(`\n🚀 [IG PUBLISH ENGINE] Step 1: Uploading ${mediaType} container for account ${igAccountId}`);
    
    // ✅ FIX: Use the correct API domain based on the connection type.
    const baseUrl = isInstagramNativeLogin(loginType) ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';

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

    const containerResponse = await axios.post(`${baseUrl}/${igAccountId}/media`, payload);
    const creationId = containerResponse.data.id;
    console.log(`✅ [IG PUBLISH ENGINE] Step 1 Success: Got container ID: ${creationId}`);

    // ✅ FIX: Poll status for images too, not just videos.
    // Native Instagram login processes image containers asynchronously.
    console.log(`⏳ [IG PUBLISH ENGINE] Step 2: Polling container status...`);
    let isReady = false;
    let retries = 0;
    const maxRetries = isVideo ? 12 : 6; // Videos need more time
    const pollInterval = isVideo ? 5000 : 3000; // 5s for video, 3s for image

    while (!isReady && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      try {
        const statusCheck = await axios.get(`${baseUrl}/${creationId}`, {
          params: { fields: 'status_code', access_token: accessToken }
        });
        const status = statusCheck.data?.status_code || 'UNKNOWN';
        console.log(`   👉 Container ${creationId} Status: ${status}`);
        if (status === 'FINISHED') {
          isReady = true;
        } else if (status === 'ERROR') {
          throw new Error("Meta processing failed with ERROR state inside media container.");
        }
      } catch (statusErr) {
        console.warn("⚠️ Retrying status polling check...", statusErr.message);
      }
      retries++;
    }

    console.log(`🚀 [IG PUBLISH ENGINE] Step 3: Publishing container ${creationId}`);
    const publishResponse = await axios.post(`${baseUrl}/${igAccountId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    
    console.log(`✅ [IG PUBLISH ENGINE] Step 3 Success: Media published with ID: ${publishResponse.data.id}`);
    return { success: true, postId: publishResponse.data.id };

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`❌ [IG PUBLISH ENGINE] Error publishing media:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * 🚀 UPGRADED: Fetches existing posts/reels from Meta to display in templates dropdown with safe dynamic array fallback
 */
exports.fetchRecentPosts = async (igAccountId, accessToken, limit = 12) => {
  // 🐛 FIX: This function was also hardcoded to graph.facebook.com.
  // It needs to be aware of the loginType to fetch posts correctly for all account types.
  // Since the controller doesn't pass loginType here, we can't fix it directly.
  // The fix in `instagramController.js` that overrides this logic is the correct approach.
  try {
    const url = `https://graph.facebook.com/v19.0/${igAccountId}/media`;
    const response = await axios.get(
      url,
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

/** Deletes a comment on media owned by the connected Instagram account. */
exports.deleteComment = async (commentId, accessToken) => {
  try {
    const response = await axios.delete(`https://graph.facebook.com/v19.0/${commentId}`, {
      params: { access_token: accessToken },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/** Deletes an Instagram media item owned by the connected account. */
exports.deleteMedia = async (mediaId, accessToken) => {
  try {
    const response = await axios.delete(`https://graph.facebook.com/v19.0/${mediaId}`, {
      params: { access_token: accessToken },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
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
 * 🚀 NEW: Fetches key business insights for an Instagram account.
 * @param {string} igAccountId - The user's Instagram Business Account ID.
 * @param {string} accessToken - The user's Instagram access token.
 * @returns {Promise<object>} - An object containing the insights data.
 */
exports.getBusinessInsights = async (igAccountId, accessToken) => {
  try {
    const dailyMetrics = 'reach,impressions,profile_views,website_clicks,accounts_engaged';
    const insightsUrl = `https://graph.facebook.com/v19.0/${igAccountId}/insights`;
    const [dailyResponse, lifetimeResponse] = await Promise.all([
      axios.get(insightsUrl, {
        params: { 
          metric: dailyMetrics, 
          period: 'day', 
          access_token: accessToken,
          metric_type: 'total_value' // Yeh line add ki gayi hai
        },
      }),
      axios.get(insightsUrl, {
        params: { metric: 'follower_count', period: 'lifetime', access_token: accessToken },
      }),
    ]);

    const insights = { last_updated: new Date().toISOString() };
    [...(dailyResponse.data?.data || []), ...(lifetimeResponse.data?.data || [])].forEach(metric => {
      const latest = metric.values?.[metric.values.length - 1];
      if (latest && typeof latest.value !== 'undefined') insights[metric.name] = latest.value;
    });
    return insights;
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
/**
 * @deprecated hardcoded to graph.facebook.com, no loginType support — use publishInstagramMedia instead
 */
exports.publishInstagramPost = async (igAccountId, accessToken, imageUrl, caption) => {
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

/**
 * 🚀 NEW: Fetches performance insights for a specific Instagram post/reel.
 * @param {string} mediaId - The ID of the Instagram post or reel.
 * @param {string} accessToken - The user's Instagram access token.
 * @returns {Promise<object>} - An object containing the insights data.
 */
exports.getPostInsights = async (mediaId, accessToken) => {
  try {
    const metrics = 'impressions,reach,saved,video_views,likes,comments,shares';
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights`;

    const response = await axios.get(url, {
      params: { metric: metrics, access_token: accessToken },
    });

    const insights = {};
    if (response.data?.data) {
      response.data.data.forEach(metric => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });
    }
    return insights;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

/**
 * Fetches a fresh, non-expired media_url / thumbnail_url for a given
 * Instagram media ID. Meta's CDN URLs are signed and time-limited, so this
 * must be called again whenever the previously stored URL is stale.
 */
exports.getFreshMediaUrl = async (mediaId, accessToken) => {
  const { data } = await axios.get(`https://graph.instagram.com/${mediaId}`, {
    params: {
      fields: 'media_type,media_url,thumbnail_url',
      access_token: accessToken,
    },
  });

  const isVideo = data.media_type?.toLowerCase() === 'video';
  return {
    url: isVideo ? (data.thumbnail_url || data.media_url) : data.media_url,
    type: isVideo ? 'video' : 'image',
  };
};
