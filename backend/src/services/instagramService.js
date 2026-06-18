// backend/src/services/instagramService.js
const axios = require('axios');

/**
 * Publishes a single image post to an Instagram Business Account.
 */
exports.publishInstagramPost = async (igAccountId, accessToken, imageUrl, caption) => {
  try {
    // Step 1: Image ko Instagram ke server par upload karke ek container ID lena
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

    // Step 2: Us container ko user ke feed par publish karna
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

// 🚀 NEW: Publishes Reels or Images directly (Used by AI Video Dashboard)
exports.publishInstagramMedia = async (igAccountId, accessToken, mediaUrl, mediaType, caption) => {
  try {
    console.log(`[IG Publish] Step 1: Uploading ${mediaType} container for account ${igAccountId}`);
    
    const payload = {
      caption: caption,
      access_token: accessToken,
    };

    if (mediaType === 'video' || mediaType === 'avatar_video') {
      payload.media_type = 'REELS';
      payload.video_url = mediaUrl;
    } else {
      payload.image_url = mediaUrl;
    }

    const containerResponse = await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/media`, payload);
    
    const creationId = containerResponse.data.id;
    console.log(`[IG Publish] Step 1 Success: Got container ID: ${creationId}`);

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
