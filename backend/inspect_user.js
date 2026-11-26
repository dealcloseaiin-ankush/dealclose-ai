const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/userModel');
  const u = await User.findOne({ email: 'ankush.bani@gmail.com' });
  console.log('USER_DATA_START');
  console.log(JSON.stringify({
    id: u._id,
    businessName: u.businessName,
    aiName: u.aiName,
    businessDescription: u.businessDescription,
    aiRules: u.aiRules,
    workspaces: (u.workspaces || []).map(w => ({
      id: w._id,
      name: w.name,
      description: w.description,
      aiName: w.aiName,
      businessDescription: w.businessDescription,
      aiRules: w.aiRules
    }))
  }, null, 2));
  console.log('USER_DATA_END');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
