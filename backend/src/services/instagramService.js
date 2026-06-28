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