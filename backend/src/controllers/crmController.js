const Contact = require('../models/contactModel');
const CrmActivity = require('../models/CrmActivitymodel');

// @desc    Get all contacts grouped by CRM Stage (For Kanban Board)
// @route   GET /api/crm/pipeline
exports.getPipeline = async (req, res) => {
  try {
    const userId = req.user._id; // Auth middleware se aayega

    const contacts = await Contact.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    // Default pipeline structure
    const pipeline = {
      new: [],
      contacted: [],
      interested: [],
      negotiating: [],
      converted: [],
      lost: []
    };

    // Group contacts by their current stage
    contacts.forEach(contact => {
      const stage = contact.crmStage || 'new';
      if (pipeline[stage]) {
        pipeline[stage].push(contact);
      } else {
        pipeline.new.push(contact); // Fallback
      }
    });

    res.status(200).json({ success: true, data: pipeline });
  } catch (error) {
    console.error('Error fetching CRM pipeline:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// @desc    Move a contact to a different stage (Drag & Drop)
// @route   PUT /api/crm/contacts/:id/stage
exports.updateStage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { newStage, reason } = req.body;

    const contact = await Contact.findOne({ _id: id, userId });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const oldStage = contact.crmStage;

    if (oldStage === newStage) {
      return res.status(200).json({ success: true, data: contact });
    }

    // Update contact stage & history
    contact.crmStage = newStage;
    contact.crmStageHistory.push({
      from: oldStage,
      to: newStage,
      changedBy: req.user.fullName || 'system',
      reason: reason || 'Manual drag & drop'
    });
    await contact.save();

    // Log activity in 360-degree timeline
    await CrmActivity.create({
      userId,
      contactId: contact._id,
      type: 'stage_change',
      description: `Stage changed: ${oldStage} → ${newStage}`,
      performedBy: req.user.fullName || 'system',
      metadata: { oldStage, newStage }
    });

    // TODO: Phase 2 - Trigger automation/webhook if set up (e.g. sync to Zoho)

    res.status(200).json({ success: true, message: 'Stage updated successfully', data: contact });
  } catch (error) {
    console.error('Error updating CRM stage:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};