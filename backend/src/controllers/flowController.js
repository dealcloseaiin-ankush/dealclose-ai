const Flow = require('../models/flowModel');

// @desc    Save or Update a Flow
// @route   POST /api/whatsapp/flows
exports.saveFlow = async (req, res) => {
  try {
    let { name, flowData, workspaceId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!flowData) {
      return res.status(400).json({ success: false, message: 'Flow data is required' });
    }

    // Auto-generate name if it's missing or empty
    if (!name || name.trim() === '') {
      name = `Flow-${Math.floor(Math.random() * 10000)}`;
    }

    // Safe check to prevent MongoDB CastError for "main" string
    const isMainWorkspace = !workspaceId || workspaceId === 'main';
    let query = { userId, name };
    if (!isMainWorkspace) query.workspaceId = workspaceId;

    // 🚀 STRICT BYPASS: Use findOneAndUpdate to force save workspaceId and flowData even if Model is outdated
    const updatePayload = { flowData };
    if (!isMainWorkspace) updatePayload.workspaceId = workspaceId;

    let flow = await Flow.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true, strict: false }
    );

    res.status(200).json({ success: true, message: 'Flow saved successfully', flow });
  } catch (error) {
    console.error('Save Flow Error details:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
};

// @desc    Get all Flows for User
// @route   GET /api/whatsapp/flows
exports.getFlows = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const flows = await Flow.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: flows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
