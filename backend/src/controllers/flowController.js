const Flow = require('../models/flowModel');

// @desc    Save or Update a Flow
// @route   POST /api/whatsapp/flows
exports.saveFlow = async (req, res) => {
  try {
    console.log("\n➡️ [DEBUG] POST /api/whatsapp/flows called!");
    console.log("➡️ [DEBUG] Request Body:", JSON.stringify(req.body).substring(0, 150) + "...");
    
    let { name, flowData, workspaceId, platform } = req.body; // 🚀 NEW: Get platform from request
    const userId = req.user?._id || req.user?.id;

    console.log(`➡️ [DEBUG] User ID from Auth: ${userId}`);

    if (!userId) {
      console.log("❌ [DEBUG] Unauthorized: User ID is missing.");
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
    }

    if (!flowData) {
      console.log("❌ [DEBUG] Error: Flow data is missing.");
      return res.status(400).json({ success: false, message: 'Flow data is required' });
    }

    // Auto-generate name if it's missing or empty
    if (!name || name.trim() === '') {
      name = `Flow-${Math.floor(Math.random() * 10000)}`;
    }

    // Safe check to prevent MongoDB CastError for "main" string
    const isMainWorkspace = !workspaceId || workspaceId === 'main';
    let query = { userId, name, platform: platform || 'whatsapp' };
    if (!isMainWorkspace) query.workspaceId = workspaceId;

    // 🚀 STRICT BYPASS: Use findOneAndUpdate to force save workspaceId and flowData even if Model is outdated
    const updatePayload = { flowData, platform: platform || 'whatsapp' };
    if (!isMainWorkspace) updatePayload.workspaceId = workspaceId; 

    console.log("➡️ [DEBUG] MongoDB Query:", query);

    let flow = await Flow.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true, strict: false }
    );

    console.log("✅ [DEBUG] Flow saved successfully in MongoDB. Flow ID:", flow._id);

    res.status(200).json({ success: true, message: 'Flow saved successfully', flow });
  } catch (error) {
    console.error('❌ [DEBUG] Save Flow Error details:', error);
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

// @desc    Delete a Flow
// @route   DELETE /api/whatsapp/flows/:flowId
exports.deleteFlow = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { flowId } = req.params;

    const deletedFlow = await Flow.findOneAndDelete({ _id: flowId, userId });

    if (!deletedFlow) {
      return res.status(404).json({ success: false, message: 'Flow not found or you do not have permission to delete it.' });
    }

    res.status(200).json({ success: true, message: 'Flow deleted successfully.' });
  } catch (error) {
    console.error('❌ [DEBUG] Delete Flow Error:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
};

// @desc    Rename a Flow
// @route   PATCH /api/whatsapp/flows/:flowId/rename
exports.renameFlow = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { flowId } = req.params;
    const { newName } = req.body;

    if (!newName || newName.trim() === '') {
      return res.status(400).json({ success: false, message: 'New name is required.' });
    }

    const updatedFlow = await Flow.findOneAndUpdate({ _id: flowId, userId }, { $set: { name: newName } }, { new: true });
    if (!updatedFlow) return res.status(404).json({ success: false, message: 'Flow not found.' });
    res.status(200).json({ success: true, message: 'Flow renamed successfully.', flow: updatedFlow });
  } catch (error) {
    console.error('❌ [DEBUG] Rename Flow Error:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
};
