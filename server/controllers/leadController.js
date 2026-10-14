const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const createAuditLog = require('../utils/auditLogger');

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const generateLeadCode = async () => {
  const count = await Lead.countDocuments();
  return `LEAD-${String(count + 1).padStart(4, '0')}`;
};

const generateCustomerCode = async () => {
  const count = await Customer.countDocuments();
  return `CUST-${String(count + 1).padStart(4, '0')}`;
};

const generateOpportunityCode = async () => {
  const count = await Opportunity.countDocuments();
  return `OPP-${String(count + 1).padStart(4, '0')}`;
};

const validTransitions = {
  New: ['Contacted', 'Unqualified', 'Lost'],
  Contacted: ['Qualified', 'Unqualified', 'Lost'],
  Qualified: ['Converted', 'Lost'],
  Unqualified: ['Contacted'],
  Lost: ['Contacted'],
  Converted: []
};

const getLeads = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'SalesExecutive') {
      query.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    const { search, status, assignedTo, company } = req.query;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { leadName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { companyName: searchRegex },
        { leadCode: searchRegex }
      ];
    }

    if (company) {
      query.companyName = new RegExp(company.trim(), 'i');
    }

    if (status) {
      query.status = status;
    }

    if (assignedTo && req.user.role !== 'SalesExecutive') {
      query.assignedTo = assignedTo;
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('convertedCustomerId', 'customerCode customerName')
      .populate('convertedOpportunityId', 'opportunityCode title amount')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('convertedCustomerId', 'customerCode customerName')
      .populate('convertedOpportunityId', 'opportunityCode title amount');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      lead.assignedTo._id.toString() !== req.user._id.toString() &&
      lead.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to this lead.' });
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createLead = async (req, res) => {
  try {
    const { leadName, email, phone, companyName, source, status, expectedValue, assignedTo } = req.body;

    if (!leadName || !leadName.trim()) {
      return res.status(400).json({ success: false, message: 'Lead name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    if (!isValidPhone(phone.trim())) {
      return res.status(400).json({ success: false, message: 'Enter a valid phone number.' });
    }

    const val = Number(expectedValue);
    if (isNaN(val) || val < 0) {
      return res.status(400).json({ success: false, message: 'Expected value must be 0 or greater.' });
    }

    const code = await generateLeadCode();
    const assignedUser = assignedTo || req.user._id;

    const lead = await Lead.create({
      leadCode: code,
      leadName: leadName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      companyName: companyName ? companyName.trim() : '',
      source: source || 'Website',
      status: status || 'New',
      expectedValue: val,
      assignedTo: assignedUser,
      createdBy: req.user._id
    });

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE',
      entityName: 'Lead',
      recordId: lead._id,
      newValue: lead,
      req
    });

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      lead.assignedTo.toString() !== req.user._id.toString() &&
      lead.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to edit this lead.' });
    }

    const oldData = lead.toObject();
    const { leadName, email, phone, companyName, source, status, expectedValue, assignedTo } = req.body;

    if (leadName) lead.leadName = leadName.trim();
    if (email) {
      if (!isValidEmail(email.trim())) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      }
      lead.email = email.toLowerCase().trim();
    }
    if (phone) {
      if (!isValidPhone(phone.trim())) {
        return res.status(400).json({ success: false, message: 'Enter a valid phone number.' });
      }
      lead.phone = phone.trim();
    }
    if (companyName !== undefined) lead.companyName = companyName.trim();
    if (source) lead.source = source;

    if (status && status !== lead.status) {
      const allowed = validTransitions[lead.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${lead.status} to ${status}. Allowed: ${allowed.join(', ') || 'None'}.`
        });
      }
      lead.status = status;
    }

    if (expectedValue !== undefined) {
      const val = Number(expectedValue);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ success: false, message: 'Expected value must be 0 or greater.' });
      }
      lead.expectedValue = val;
    }

    if (assignedTo && req.user.role !== 'SalesExecutive') {
      lead.assignedTo = assignedTo;
    }

    await lead.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE',
      entityName: 'Lead',
      recordId: lead._id,
      oldValue: oldData,
      newValue: lead,
      req
    });

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const convertLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (lead.status === 'Converted') {
      return res.status(400).json({ success: false, message: 'This lead has already been converted.' });
    }

    const { createOpportunity, opportunityTitle, amount, probability, expectedCloseDate } = req.body;

    let customer = await Customer.findOne({
      $or: [{ email: lead.email }, { phone: lead.phone }]
    });

    if (!customer) {
      const customerCode = await generateCustomerCode();
      customer = await Customer.create({
        customerCode,
        customerName: lead.leadName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName || '',
        status: 'Active',
        createdBy: req.user._id
      });

      await createAuditLog({
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'CREATE',
        entityName: 'Customer',
        recordId: customer._id,
        newValue: customer,
        req
      });
    }

    let opportunity = null;
    if (createOpportunity) {
      const oppAmount = Number(amount || lead.expectedValue || 0);
      const oppProb = Number(probability || 20);

      if (oppAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Opportunity Amount must be greater than 0.' });
      }
      if (oppProb < 0 || oppProb > 100) {
        return res.status(400).json({ success: false, message: 'Probability must be between 0 and 100.' });
      }

      if (!expectedCloseDate) {
        return res.status(400).json({ success: false, message: 'Expected close date is required.' });
      }

      const closeDate = new Date(expectedCloseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (closeDate < today) {
        return res.status(400).json({ success: false, message: 'Expected Close Date cannot be in the past.' });
      }

      const oppCode = await generateOpportunityCode();
      opportunity = await Opportunity.create({
        opportunityCode: oppCode,
        title: opportunityTitle || `${lead.leadName} - Deal`,
        customer: customer._id,
        stage: 'Qualification',
        amount: oppAmount,
        probability: oppProb,
        expectedCloseDate: closeDate,
        assignedTo: lead.assignedTo || req.user._id,
        createdBy: req.user._id
      });

      await createAuditLog({
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'CREATE',
        entityName: 'Opportunity',
        recordId: opportunity._id,
        newValue: opportunity,
        req
      });
    }

    const oldData = lead.toObject();
    lead.status = 'Converted';
    lead.convertedCustomerId = customer._id;
    if (opportunity) {
      lead.convertedOpportunityId = opportunity._id;
    }
    await lead.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CONVERT_LEAD',
      entityName: 'Lead',
      recordId: lead._id,
      oldValue: oldData,
      newValue: lead,
      req
    });

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('convertedCustomerId', 'customerCode customerName')
      .populate('convertedOpportunityId', 'opportunityCode title amount');

    res.status(200).json({
      success: true,
      message: 'Lead converted successfully.',
      data: {
        lead: populated,
        customer,
        opportunity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      lead.assignedTo.toString() !== req.user._id.toString() &&
      lead.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to delete this lead.' });
    }

    const oldData = lead.toObject();
    await Lead.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE',
      entityName: 'Lead',
      recordId: lead._id,
      oldValue: oldData,
      req
    });

    res.status(200).json({ success: true, message: 'Lead deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  convertLead,
  deleteLead
};

