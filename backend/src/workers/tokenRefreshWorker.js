const cron = require('node-cron');
const axios = require('axios');
const User = require('../models/userModel');

const REFRESH_MARGIN_MS = 10 * 24 * 60 * 60 * 1000; // refresh if <10 days left

const refreshToken = async (currentAccessToken) => {
  const { data } = await axios.get('https://graph.instagram.com/refresh_access_token', {
    params: {
      grant_type: 'ig_refresh_token',
      access_token: currentAccessToken,
    },
  });
  return data; // { access_token, expires_in, token_type }
};

const refreshRootConfig = async (user) => {
  if (!user.instagramConfig?.accessToken || !user.instagramConfig?.tokenExpiresAt) return;
  const expiresAt = new Date(user.instagramConfig.tokenExpiresAt).getTime();
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) return; // not due yet

  try {
    const { access_token, expires_in } = await refreshToken(user.instagramConfig.accessToken); // API call
    const newExpiry = new Date(Date.now() + expires_in * 1000);
    // Perform atomic update directly
    await User.updateOne(
      { _id: user._id },
      { $set: {
          "instagramConfig.accessToken": access_token,
          "instagramConfig.tokenExpiresAt": newExpiry,
          "instagramConfig.needsReconnect": false // Reset flag on success
      }}
    );
    console.log(`✅ [Token Refresh] Root Instagram token refreshed for user ${user.email}`);
  } catch (err) {
    console.error(`❌ [Token Refresh] Failed for user ${user.email} (root):`, err.response?.data || err.message);
    // Token is likely already dead — flag for manual reconnect rather than retrying forever.
    await User.updateOne({ _id: user._id }, { $set: { "instagramConfig.needsReconnect": true } });
  }
};

const refreshWorkspaceConfigs = async (user) => {
  if (!Array.isArray(user.workspaces)) return;
  for (const ws of user.workspaces) {
    if (!ws.instagramConfig?.accessToken || !ws.instagramConfig?.tokenExpiresAt) continue;
    const expiresAt = new Date(ws.instagramConfig.tokenExpiresAt).getTime();
    if (expiresAt - Date.now() > REFRESH_MARGIN_MS) continue;

    try {
      const { access_token, expires_in } = await refreshToken(ws.instagramConfig.accessToken); // API call
      const newExpiry = new Date(Date.now() + expires_in * 1000);
      // 🚀 FUTURE-PROOFING: Use positional operator '$' to update only the matched workspace sub-document.
      // This prevents overwriting the entire array and avoids race conditions if another workspace is added/removed concurrently.
      await User.updateOne(
        { _id: user._id, "workspaces._id": ws._id },
        { $set: {
            "workspaces.$.instagramConfig.accessToken": access_token,
            "workspaces.$.instagramConfig.tokenExpiresAt": newExpiry,
            "workspaces.$.instagramConfig.needsReconnect": false // Reset flag
        }}
      );
      console.log(`✅ [Token Refresh] Workspace "${ws.name || ws._id}" token refreshed for user ${user.email}`);
    } catch (err) {
      console.error(`❌ [Token Refresh] Failed for user ${user.email}, workspace ${ws._id}:`, err.response?.data || err.message);
      await User.updateOne({ _id: user._id, "workspaces._id": ws._id }, { $set: { "workspaces.$.instagramConfig.needsReconnect": true } });
    }
  }
};

const runTokenRefreshJob = async () => {
  console.log('🔄 [Token Refresh Job] Starting daily Instagram token refresh sweep...');
  const users = await User.find({
    $or: [
      { 'instagramConfig.accessToken': { $exists: true, $ne: null } },
      { 'workspaces.instagramConfig.accessToken': { $exists: true, $ne: null } },
    ],
  });

  for (const user of users) {
    await refreshRootConfig(user);
    await refreshWorkspaceConfigs(user);
  }
  console.log(`🔄 [Token Refresh Job] Completed. Checked ${users.length} user(s).`);
};

// Run once daily at 03:00 server time — low-traffic window.
const scheduleTokenRefreshJob = () => {
  // 🚀 FIX: The cron job was not being awaited, which could lead to unhandled promise rejections.
  cron.schedule('0 3 * * *', () => { runTokenRefreshJob().catch(err => console.error('❌ [Token Refresh Job] Unhandled error:', err)); });
  console.log('✅ Scheduled daily Instagram token refresh job.');
};

module.exports = { scheduleTokenRefreshJob, runTokenRefreshJob };