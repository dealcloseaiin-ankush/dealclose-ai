const Form = require('../models/formModel');

// @desc    Get all forms for a user
exports.getForms = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const forms = await Form.find({ createdBy: userId }).sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new form
exports.createForm = async (req, res) => {
  try {
    const { title, description, fields } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const newForm = new Form({
      title,
      description,
      fields,
      createdBy: userId
    });

    const savedForm = await newForm.save();
    res.status(201).json(savedForm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Submit data to a form
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

    res.status(201).json({ message: 'Submission received successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};