const Form = require('../models/formModel');
const Lead = require('../models/leadModel');

// @desc    Get all forms for a user
exports.getForms = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const query = { createdBy: userId };
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
      query.workspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.$or = [{ workspaceId: 'main' }, { workspaceId: { $exists: false } }, { workspaceId: null }];
    }

    const forms = await Form.find(query).sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new form
exports.createForm = async (req, res) => {
  try {
    const { title, description, fields, workspaceId } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const newForm = new Form({
      title,
      description,
      fields,
      workspaceId: workspaceId || 'main',
      createdBy: userId
    });

    const savedForm = await newForm.save();
    res.status(201).json(savedForm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Get submissions of a specific form
exports.getFormSubmissions = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const form = await Form.findOne({ _id: formId, createdBy: userId });
    if (!form) return res.status(404).json({ message: 'Form not found' });

    res.json({
      title: form.title,
      submissions: form.submissions || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Submit data to a form (Auto-syncs to CRM with all custom fields)
exports.submitForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { data } = req.body;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    form.submissions.push({ data });
    await form.save();

    // 🚀 CRM AUTO-INGESTION: Extract Name, Phone, Email & Custom Fields
    if (data && typeof data === 'object') {
      let extractedName = 'Form Lead';
      let extractedPhone = '';
      let extractedEmail = '';
      const customFields = {};
      let formattedNotes = `📝 Form: ${form.title}\nSubmitted on: ${new Date().toLocaleString()}\n------------------------\n`;

      Object.entries(data).forEach(([key, val]) => {
        const lowerKey = key.toLowerCase().trim();
        const strVal = String(val || '').trim();
        formattedNotes += `${key}: ${strVal}\n`;

        if (!extractedPhone && (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('whatsapp') || lowerKey.includes('contact') || /^[0-9+ ]{8,15}$/.test(strVal))) {
          extractedPhone = strVal.replace(/[^0-9+]/g, '');
        } else if (extractedName === 'Form Lead' && (lowerKey.includes('name') || lowerKey === 'full name' || lowerKey === 'first name')) {
          extractedName = strVal;
        } else if (!extractedEmail && (lowerKey.includes('email') || strVal.includes('@'))) {
          extractedEmail = strVal;
        } else {
          customFields[key] = strVal;
        }
      });

      if (extractedPhone) {
        // Find existing or create new CRM lead
        let lead = await Lead.findOne({ userId: form.createdBy, phoneNumber: extractedPhone });
        if (lead) {
          lead.notes = `${formattedNotes}\n\n${lead.notes || ''}`;
          lead.customFields = { ...(lead.customFields ? Object.fromEntries(lead.customFields) : {}), ...customFields };
          lead.timeline.push({
            eventType: 'form_submission',
            description: `Submitted form: "${form.title}".`,
            timestamp: new Date()
          });
          await lead.save();
        } else {
          await Lead.create({
            userId: form.createdBy,
            createdBy: form.createdBy,
            name: extractedName,
            phoneNumber: extractedPhone,
            email: extractedEmail || undefined,
            source: `Form: ${form.title}`,
            status: 'new',
            notes: formattedNotes,
            customFields,
            lastSelectedWorkspaceId: form.workspaceId || 'main',
            timeline: [{
              eventType: 'form_submission',
              description: `Captured from form: "${form.title}".`,
              timestamp: new Date()
            }]
          });
        }
      }
    }

    res.status(201).json({ message: 'Submission received successfully' });
  } catch (err) {
    console.error('Form submission error:', err);
    res.status(400).json({ message: err.message });
  }
};