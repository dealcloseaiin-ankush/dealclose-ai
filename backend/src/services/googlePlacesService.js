const axios = require('axios');
const User = require('../models/userModel');

/**
 * Search Google Places by text query (e.g. "Ganesh Traders Sarangarh")
 * Uses Google Places API (New) with fallback to SerpAPI
 */
exports.searchGoogleBusiness = async (query) => {
  if (!query) throw new Error('Search query is required.');

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GEMINI_API_KEY;
  console.log(`[GooglePlacesService] 🔍 Searching Google Places for: "${query}"`);

  // 1. Try Google Places API (New) Text Search
  if (apiKey && !apiKey.includes('dummy')) {
    try {
      const url = 'https://places.googleapis.com/v1/places:searchText';
      const response = await axios.post(
        url,
        { textQuery: query },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber'
          },
          timeout: 6000
        }
      );

      const places = response.data?.places || [];
      if (places.length > 0) {
        console.log(`✅ [GooglePlacesService] Found ${places.length} places via Places API (New)`);
        return places.map(p => ({
          placeId: p.id,
          name: p.displayName?.text || '',
          address: p.formattedAddress || '',
          rating: p.rating || 0,
          userRatingCount: p.userRatingCount || 0,
          googleMapsUri: p.googleMapsUri || '',
          phoneNumber: p.nationalPhoneNumber || '',
          website: p.websiteUri || '',
          source: 'google_places_api'
        }));
      }
    } catch (err) {
      console.warn(`⚠️ [GooglePlacesService] Places API (New) lookup failed: ${err.message}. Falling back to SerpAPI.`);
    }
  }

  // 2. Fallback to SerpAPI Google Maps Engine
  if (process.env.SERP_API_KEY) {
    try {
      const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${process.env.SERP_API_KEY}`;
      const serpRes = await axios.get(serpUrl, { timeout: 8000 });
      const data = serpRes.data;

      if (data.local_results && data.local_results.length > 0) {
        console.log(`✅ [GooglePlacesService] Found ${data.local_results.length} places via SerpAPI fallback`);
        return data.local_results.map(r => ({
          placeId: r.place_id || r.data_id || '',
          name: r.title || '',
          address: r.address || '',
          rating: r.rating || 0,
          userRatingCount: r.reviews || 0,
          googleMapsUri: r.link || '',
          phoneNumber: r.phone || '',
          website: r.website || '',
          source: 'serp_maps_fallback'
        }));
      } else if (data.place_results) {
        const p = data.place_results;
        return [{
          placeId: p.place_id || p.data_id || '',
          name: p.title || '',
          address: p.address || '',
          rating: p.rating || 0,
          userRatingCount: p.reviews || 0,
          googleMapsUri: p.link || '',
          phoneNumber: p.phone || '',
          website: p.website || '',
          source: 'serp_maps_fallback'
        }];
      }
    } catch (serpErr) {
      console.error(`❌ [GooglePlacesService] SerpAPI fallback error:`, serpErr.message);
    }
  }

  return [];
};

/**
 * Synchronize Google Rating for a user's digital card (Weekly Sync Engine)
 */
exports.syncUserGoogleRating = async (userId, workspaceId = 'main') => {
  const user = await User.findById(userId);
  if (!user) return null;

  let bizName = user.businessName;
  let currentCardConfig = user.digitalCardConfig || {};

  if (workspaceId !== 'main' && Array.isArray(user.workspaces)) {
    const ws = user.workspaces.find(w => String(w._id) === String(workspaceId));
    if (ws) {
      bizName = ws.name || bizName;
      currentCardConfig = ws.digitalCardConfig || {};
    }
  }

  if (!bizName) return null;

  const results = await exports.searchGoogleBusiness(bizName);
  if (results.length > 0) {
    const matched = results[0];
    const updatePayload = {
      'digitalCardConfig.googleRating': matched.rating,
      'digitalCardConfig.userRatingCount': matched.userRatingCount,
      'digitalCardConfig.lastRatingSyncedAt': new Date(),
      'digitalCardConfig.googlePlaceId': matched.placeId,
      'digitalCardConfig.googleBusiness': matched.googleMapsUri || currentCardConfig.googleBusiness
    };

    if (workspaceId === 'main') {
      await User.findByIdAndUpdate(userId, { $set: updatePayload });
    } else {
      await User.updateOne(
        { _id: userId, 'workspaces._id': workspaceId },
        {
          $set: {
            'workspaces.$.digitalCardConfig.googleRating': matched.rating,
            'workspaces.$.digitalCardConfig.userRatingCount': matched.userRatingCount,
            'workspaces.$.digitalCardConfig.lastRatingSyncedAt': new Date(),
            'workspaces.$.digitalCardConfig.googlePlaceId': matched.placeId,
            'workspaces.$.digitalCardConfig.googleBusiness': matched.googleMapsUri || currentCardConfig.googleBusiness
          }
        }
      );
    }

    console.log(`⭐ [GoogleRatingSync] Updated rating for "${bizName}": ${matched.rating}★ (${matched.userRatingCount} reviews)`);
    return {
      name: matched.name,
      rating: matched.rating,
      userRatingCount: matched.userRatingCount,
      googleMapsUri: matched.googleMapsUri
    };
  }

  return null;
};
