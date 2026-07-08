const { google } = require('googleapis');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const Flow = require('../models/flowModel');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY; // Must be a 32-byte key

const encrypt = (text) => {
  if (!ENCRYPTION_KEY) return text; // Skip encryption if key is not set
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const getAuthenticatedDriveClient = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.googleSheetsConfig?.refreshToken) {
    throw new Error('Google Drive not connected or refresh token is missing.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage' // Redirect URI is not needed for server-side refresh
  );

  oauth2Client.setCredentials({ refresh_token: user.googleSheetsConfig.refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
};

// @desc    Create a backup of user data to Google Drive
// @route   POST /api/backup/create
exports.createBackup = async (req, res) => {
  try {
    const userId = req.user?._id;
    const drive = await getAuthenticatedDriveClient(userId);

    // 1. Find or create the "DealClose AI Backups" folder
    let folderId;
    const folderQuery = "name='DealClose AI Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    const folderRes = await drive.files.list({ q: folderQuery, fields: 'files(id)' });

    if (folderRes.data.files.length > 0) {
      folderId = folderRes.data.files[0].id;
    } else {
      const folderMetadata = { name: 'DealClose AI Backups', mimeType: 'application/vnd.google-apps.folder' };
      const createdFolder = await drive.files.create({ resource: folderMetadata, fields: 'id' });
      folderId = createdFolder.data.id;
    }

    // 2. Gather all data to be backed up
    const activeLeads = await Lead.find({ userId, status: { $ne: 'deleted' } }).lean();
    const deletedLeadIds = await Lead.find({ userId, status: 'deleted' }).select('_id').lean();

    const flows = await Flow.find({ userId }).lean();
    const userSettings = await User.findById(userId).select('-password -googleSheetsConfig').lean();

    const backupData = {
      backupVersion: "1.0",
      exportedAt: new Date().toISOString(),
      userId,
      leads: activeLeads,
      deletedLeadIds: deletedLeadIds.map(l => l._id), // 🚀 NEW: Track deleted leads
      flows,
      settings: userSettings
    };

    // 3. Encrypt the data
    const encryptedContent = encrypt(JSON.stringify(backupData));

    // 4. Upload the file to the folder
    const fileName = `dealclose_backup_${new Date().toISOString().split('T')[0]}.json.enc`;
    const fileMetadata = { name: fileName, parents: [folderId] };
    const media = { mimeType: 'application/octet-stream', body: encryptedContent };

    await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    // 5. Update user's last backup time
    await User.findByIdAndUpdate(userId, { 'googleSheetsConfig.lastBackupAt': new Date() });

    res.status(200).json({ success: true, message: 'Backup successfully created on Google Drive.' });

  } catch (error) {
    console.error('Google Drive Backup Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List available backups from Google Drive
// @route   GET /api/backup/list
exports.listBackups = async (req, res) => {
  try {
    const userId = req.user?._id;
    const drive = await getAuthenticatedDriveClient(userId);

    const folderQuery = "name='DealClose AI Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    const folderRes = await drive.files.list({ q: folderQuery, fields: 'files(id)' });
    if (folderRes.data.files.length === 0) return res.status(200).json({ success: true, backups: [] });

    const folderId = folderRes.data.files[0].id;
    const fileRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc'
    });

    res.status(200).json({ success: true, backups: fileRes.data.files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};