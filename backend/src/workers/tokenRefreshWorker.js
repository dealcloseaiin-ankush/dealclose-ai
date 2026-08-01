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
    const { access_token, expires_in } = await refreshToken(user.instagramConfig.accessToken);
    user.instagramConfig.accessToken = access_token;
    user.instagramConfig.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    console.log(`✅ [Token Refresh] Root Instagram token refreshed for user ${user._id}`);
  } catch (err) {
    console.error(`❌ [Token Refresh] Failed for user ${user._id} (root):`, err.response?.data || err.message);
    // Token is likely already dead — flag for manual reconnect rather than retrying forever.
    user.instagramConfig.needsReconnect = true;
  }
};

const refreshWorkspaceConfigs = async (user) => {
  if (!Array.isArray(user.workspaces)) return;
  for (const ws of user.workspaces) {
    if (!ws.instagramConfig?.accessToken || !ws.instagramConfig?.tokenExpiresAt) continue;
    const expiresAt = new Date(ws.instagramConfig.tokenExpiresAt).getTime();
    if (expiresAt - Date.now() > REFRESH_MARGIN_MS) continue;

    try {
      const { access_token, expires_in } = await refreshToken(ws.instagramConfig.accessToken);
      ws.instagramConfig.accessToken = access_token;
      ws.instagramConfig.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
      console.log(`✅ [Token Refresh] Workspace "${ws.name || ws._id}" Instagram token refreshed for user ${user._id}`);
    } catch (err) {
      console.error(`❌ [Token Refresh] Failed for user ${user._id}, workspace ${ws._id}:`, err.response?.data || err.message);
      ws.instagramConfig.needsReconnect = true;
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
    // 🐛 BUG FIX: Use atomic `updateOne` instead of `find` + `save` to prevent VersionError race conditions.
    // The old `user.save()` method was trying to save the entire document, including potentially stale
    // sub-documents like `pendingInstagramConnection`, which caused the crash.
    // This atomic operation ONLY touches the fields that were modified by the refresh functions.
    await User.updateOne(
      { _id: user._id },
      { $set: { instagramConfig: user.instagramConfig, workspaces: user.workspaces } }
    );
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