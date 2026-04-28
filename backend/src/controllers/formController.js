const Form = require('../models/formModel');

// @desc    Get all forms for a user
exports.getForms = async (req, res) => {
  try {
    // Later, we will filter by req.user.id
    const forms = await Form.find({}).sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new form
exports.createForm = async (req, res) => {
  try {
    const { title, description, fields } = req.body;
    
    const newForm = new Form({
      title,
      description,
      fields,
      createdBy: "60d0fe4f5311236168a109ca" // Placeholder: Replace with req.user.id from auth
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