const FollowUp = require('../models/FollowUp');
const createAuditLog = require('../utils/auditLogger');

const getFollowUps = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'SalesExecutive') {
      query.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    const { filter, status, relatedType, customer, lead, assignedTo } = req.query;

    const now = new Date();

    if (filter === 'overdue') {
      query.status = 'Pending';
      query.followUpDate = { $lt: now };
    } else if (filter === 'pending') {
      query.status = 'Pending';
      query.followUpDate = { $gte: now };
    } else if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.followUpDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (status) {
      query.status = status;
    }

    if (relatedType) query.relatedType = relatedType;
    if (customer) query.customer = customer;
    if (lead) query.lead = lead;
    if (assignedTo && req.user.role !== 'SalesExecutive') query.assignedTo = assignedTo;

    const followUps = await FollowUp.find(query)
      .populate('customer', 'customerCode customerName email phone')
      .populate('lead', 'leadCode leadName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ followUpDate: 1 });

    res.status(200).json({ success: true, count: followUps.length, data: followUps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFollowUpById = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate('customer', 'customerCode customerName email phone')
      .populate('lead', 'leadCode leadName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      followUp.assignedTo._id.toString() !== req.user._id.toString() &&
      followUp.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to this follow-up.' });
    }

    res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createFollowUp = async (req, res) => {
  try {
    const { title, description, followUpDate, relatedType, customer, lead, assignedTo } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Follow-up title is required.' });
    }
    if (!followUpDate) {
      return res.status(400).json({ success: false, message: 'Follow-up date is required.' });
    }

    const scheduledDate = new Date(followUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduledDate < today) {
      return res.status(400).json({ success: false, message: 'Follow-up date cannot be earlier than today.' });
    }

    if (!relatedType || !['Customer', 'Lead'].includes(relatedType)) {
      return res.status(400).json({ success: false, message: 'Related type must be Customer or Lead.' });
    }

    if (relatedType === 'Customer' && !customer) {
      return res.status(400).json({ success: false, message: 'Please select a Customer.' });
    }

    if (relatedType === 'Lead' && !lead) {
      return res.status(400).json({ success: false, message: 'Please select a Lead.' });
    }

    const assignedUser = assignedTo || req.user._id;

    const followUp = await FollowUp.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      followUpDate: scheduledDate,
      status: 'Pending',
      relatedType,
      customer: relatedType === 'Customer' ? customer : null,
      lead: relatedType === 'Lead' ? lead : null,
      assignedTo: assignedUser,
      createdBy: req.user._id
    });

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE',
      entityName: 'FollowUp',
      recordId: followUp._id,
      newValue: followUp,
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('customer', 'customerCode customerName email phone')
      .populate('lead', 'leadCode leadName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateFollowUp = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      followUp.assignedTo.toString() !== req.user._id.toString() &&
      followUp.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to edit this follow-up.' });
    }

    const oldData = followUp.toObject();
    const { title, description, followUpDate, status, assignedTo } = req.body;

    if (title) followUp.title = title.trim();
    if (description !== undefined) followUp.description = description.trim();

    if (followUpDate) {
      followUp.followUpDate = new Date(followUpDate);
    }

    if (status && ['Pending', 'Completed', 'Cancelled'].includes(status)) {
      followUp.status = status;
      if (status === 'Completed' && !followUp.completedAt) {
        followUp.completedAt = new Date();
      }
    }

    if (assignedTo && req.user.role !== 'SalesExecutive') {
      followUp.assignedTo = assignedTo;
    }

    await followUp.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE',
      entityName: 'FollowUp',
      recordId: followUp._id,
      oldValue: oldData,
      newValue: followUp,
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('customer', 'customerCode customerName email phone')
      .populate('lead', 'leadCode leadName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const completeFollowUp = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      followUp.assignedTo.toString() !== req.user._id.toString() &&
      followUp.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const oldData = followUp.toObject();
    followUp.status = 'Completed';
    followUp.completedAt = new Date();
    await followUp.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'COMPLETE_FOLLOWUP',
      entityName: 'FollowUp',
      recordId: followUp._id,
      oldValue: oldData,
      newValue: followUp,
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('customer', 'customerCode customerName email phone')
      .populate('lead', 'leadCode leadName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rescheduleFollowUp = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      followUp.assignedTo.toString() !== req.user._id.toString() &&
      followUp.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { newDate } = req.body;
    if (!newDate) {
      return res.status(400).json({ success: false, message: 'New follow-up date is required.' });
    }

    const scheduledDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduledDate < today) {
      return res.status(400).json({ success: false, message: 'Follow-up date cannot be earlier than today.' });
    }

    const oldData = followUp.toObject();
    followUp.followUpDate = scheduledDate;
    followUp.status = 'Pending';
    await followUp.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'RESCHEDULE_FOLLOWUP',
      entityName: 'FollowUp',
      recordId: followUp._id,
      oldValue: oldData,
      newValue: followUp,
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('customer', 'customerCode customerName email phone')
      .populate('lead', 'leadCode leadName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteFollowUp = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      followUp.assignedTo.toString() !== req.user._id.toString() &&
      followUp.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to delete this follow-up.' });
    }

    const oldData = followUp.toObject();
    await FollowUp.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE',
      entityName: 'FollowUp',
      recordId: followUp._id,
      oldValue: oldData,
      req
    });

    res.status(200).json({ success: true, message: 'Follow-up deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  rescheduleFollowUp,
  deleteFollowUp
};

