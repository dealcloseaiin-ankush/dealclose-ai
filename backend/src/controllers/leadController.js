const Lead = require('../models/leadModel');

// @desc    Get all leads
// @route   GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    // Future: Filter by req.user.id
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new lead
// @route   POST /api/leads
exports.createLead = async (req, res) => {
  try {
    const { name, phoneNumber, email, status, source, createdBy } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: 'Name and Phone Number are required' });
    }

    const lead = await Lead.create({
      name,
      phoneNumber,
      email,
      status,
      source,
      createdBy // Frontend se bhejna padega abhi ke liye
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export leads to CSV
// @route   GET /api/leads/export
exports.exportLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    
    // Simple CSV Generation
    const headers = ['Name', 'Phone', 'Email', 'Status', 'Source', 'Created At'];
    const csvRows = [headers.join(',')];
    
    leads.forEach(lead => {
      const dateStr = new Date(lead.createdAt).toLocaleDateString();
      csvRows.push(`${lead.name},${lead.phoneNumber},${lead.email || 'N/A'},${lead.status},${lead.source},${dateStr}`);
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    res.status(200).send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Lead Analytics for Dashboard Graphs
// @route   GET /api/leads/analytics
exports.getLeadAnalytics = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const totalLeads = await Lead.countDocuments({ userId });
    const converted = await Lead.countDocuments({ userId, status: 'converted' });
    const interested = await Lead.countDocuments({ userId, status: 'interested' });
    const ignored = await Lead.countDocuments({ userId, status: 'ignored' });
    
    // Calculations
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(2) : 0;
    
    // For now, setting a fixed investment mock value (e.g. ₹500 AI cost). 
    // Future me isko User ki exact wallet usage se fetch karenge.
    const totalInvestment = 500; 
    const costPerLead = totalLeads > 0 ? (totalInvestment / totalLeads).toFixed(2) : 0;

    const graphData = [
      { name: 'Converted', value: converted },
      { name: 'Interested', value: interested },
      { name: 'Ignored', value: ignored }
    ];

    res.status(200).json({
      stats: { totalLeads, converted, conversionRate, totalInvestment, costPerLead },
      graphData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};