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

    // Upsert (Update if exists, Create if not)
    let flow = await Flow.findOne({ userId, name, workspaceId });
    if (flow) {
      flow.flowData = flowData;
      await flow.save();
    } else {
      flow = await Flow.create({ userId, name, flowData, workspaceId });
    }

    res.status(200).json({ success: true, message: 'Flow saved successfully', flow });
  } catch (error) {
    console.error('Save Flow Error:', error);
    res.status(500).json({ success: false, message: error.message });
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
