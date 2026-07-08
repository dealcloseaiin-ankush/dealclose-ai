const cron = require('node-cron');
const path = require('path');
// 🚀 FIX: Corrected the relative path to the leadModel file from the root jobs folder. This now correctly points to the backend source.
const Lead = require(path.join(__dirname, '..', 'src', 'models', 'leadModel'));

const cleanupOldTrash = async () => {
  // Find leads that were soft-deleted more than 90 days ago
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  try {
    const result = await Lead.deleteMany({
      status: 'deleted',
      deletedAt: { $lt: ninetyDaysAgo }
    });
    if (result.deletedCount > 0) {
      console.log(`[Trash Cleanup] Permanently removed ${result.deletedCount} leads older than 90 days.`);
    }
  } catch (error) {
    console.error('❌ Error during lead cleanup cron job:', error);
  }
};

// Schedule the job to run once every day at 3 AM
cron.schedule('0 3 * * *', cleanupOldTrash);

console.log('✅ Scheduled daily trash cleanup job.');