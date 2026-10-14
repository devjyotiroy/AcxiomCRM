const Opportunity = require('../models/Opportunity');
const createAuditLog = require('../utils/auditLogger');

const generateOpportunityCode = async () => {
  const count = await Opportunity.countDocuments();
  return `OPP-${String(count + 1).padStart(4, '0')}`;
};

const getOpportunities = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'SalesExecutive') {
      query.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    const { stage, customer, assignedTo, search } = req.query;

    if (stage) {
      query.stage = stage;
    }

    if (customer) {
      query.customer = customer;
    }

    if (assignedTo && req.user.role !== 'SalesExecutive') {
      query.assignedTo = assignedTo;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { opportunityCode: searchRegex }
      ];
    }

    const opportunities = await Opportunity.find(query)
      .populate('customer', 'customerCode customerName email phone companyName')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    const withWeighted = opportunities.map((opp) => {
      const obj = opp.toObject();
      obj.weightedAmount = Number(((obj.amount * obj.probability) / 100).toFixed(2));
      return obj;
    });

    res.status(200).json({ success: true, count: withWeighted.length, data: withWeighted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('customer', 'customerCode customerName email phone companyName')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      opportunity.assignedTo._id.toString() !== req.user._id.toString() &&
      opportunity.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to this opportunity.' });
    }

    const obj = opportunity.toObject();
    obj.weightedAmount = Number(((obj.amount * obj.probability) / 100).toFixed(2));

    res.status(200).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createOpportunity = async (req, res) => {
  try {
    const { title, customer, stage, amount, probability, expectedCloseDate, assignedTo } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Opportunity title is required.' });
    }
    if (!customer) {
      return res.status(400).json({ success: false, message: 'Customer is required.' });
    }

    const numAmount = Number(amount);
    const numProb = Number(probability);
    const selectedStage = stage || 'Qualification';

    if (isNaN(numProb) || numProb < 0 || numProb > 100) {
      return res.status(400).json({ success: false, message: 'Probability must be between 0 and 100.' });
    }

    const isActiveStage = ['Qualification', 'Proposal', 'Negotiation'].includes(selectedStage);

    if (isActiveStage && (isNaN(numAmount) || numAmount <= 0)) {
      return res.status(400).json({ success: false, message: 'Opportunity Amount must be greater than 0.' });
    }

    if (!expectedCloseDate) {
      return res.status(400).json({ success: false, message: 'Expected close date is required.' });
    }

    const closeDate = new Date(expectedCloseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isActiveStage && closeDate < today) {
      return res.status(400).json({ success: false, message: 'Expected Close Date cannot be in the past.' });
    }

    const code = await generateOpportunityCode();
    const assignedUser = assignedTo || req.user._id;

    const opportunity = await Opportunity.create({
      opportunityCode: code,
      title: title.trim(),
      customer,
      stage: selectedStage,
      amount: isNaN(numAmount) ? 0 : numAmount,
      probability: numProb,
      expectedCloseDate: closeDate,
      assignedTo: assignedUser,
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

    const populated = await Opportunity.findById(opportunity._id)
      .populate('customer', 'customerCode customerName email phone companyName')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      opportunity.assignedTo.toString() !== req.user._id.toString() &&
      opportunity.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to edit this opportunity.' });
    }

    const oldData = opportunity.toObject();
    const { title, customer, stage, amount, probability, expectedCloseDate, assignedTo } = req.body;

    const targetStage = stage || opportunity.stage;
    const isActiveStage = ['Qualification', 'Proposal', 'Negotiation'].includes(targetStage);

    if (title) opportunity.title = title.trim();
    if (customer) opportunity.customer = customer;
    if (stage) opportunity.stage = stage;

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isActiveStage && (isNaN(numAmount) || numAmount <= 0)) {
        return res.status(400).json({ success: false, message: 'Opportunity Amount must be greater than 0.' });
      }
      opportunity.amount = isNaN(numAmount) ? 0 : numAmount;
    }

    if (probability !== undefined) {
      const numProb = Number(probability);
      if (isNaN(numProb) || numProb < 0 || numProb > 100) {
        return res.status(400).json({ success: false, message: 'Probability must be between 0 and 100.' });
      }
      opportunity.probability = numProb;
    }

    if (expectedCloseDate) {
      const closeDate = new Date(expectedCloseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isActiveStage && closeDate < today) {
        return res.status(400).json({ success: false, message: 'Expected Close Date cannot be in the past.' });
      }
      opportunity.expectedCloseDate = closeDate;
    }

    if (assignedTo && req.user.role !== 'SalesExecutive') {
      opportunity.assignedTo = assignedTo;
    }

    await opportunity.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE',
      entityName: 'Opportunity',
      recordId: opportunity._id,
      oldValue: oldData,
      newValue: opportunity,
      req
    });

    const populated = await Opportunity.findById(opportunity._id)
      .populate('customer', 'customerCode customerName email phone companyName')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      opportunity.assignedTo.toString() !== req.user._id.toString() &&
      opportunity.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to delete this opportunity.' });
    }

    const oldData = opportunity.toObject();
    await Opportunity.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE',
      entityName: 'Opportunity',
      recordId: opportunity._id,
      oldValue: oldData,
      req
    });

    res.status(200).json({ success: true, message: 'Opportunity deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity
};

