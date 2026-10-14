const Activity = require('../models/Activity');
const createAuditLog = require('../utils/auditLogger');

const getActivities = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'SalesExecutive') {
      query.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    const { type, status, relatedType, customer, lead, opportunity, assignedTo } = req.query;

    if (type) query.type = type;
    if (status) query.status = status;
    if (relatedType) query.relatedType = relatedType;
    if (customer) query.customer = customer;
    if (lead) query.lead = lead;
    if (opportunity) query.opportunity = opportunity;
    if (assignedTo && req.user.role !== 'SalesExecutive') query.assignedTo = assignedTo;

    const activities = await Activity.find(query)
      .populate('customer', 'customerCode customerName')
      .populate('lead', 'leadCode leadName')
      .populate('opportunity', 'opportunityCode title')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ activityDate: -1 });

    res.status(200).json({ success: true, count: activities.length, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('customer', 'customerCode customerName')
      .populate('lead', 'leadCode leadName')
      .populate('opportunity', 'opportunityCode title')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      activity.assignedTo._id.toString() !== req.user._id.toString() &&
      activity.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to this activity.' });
    }

    res.status(200).json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createActivity = async (req, res) => {
  try {
    const { type, subject, description, activityDate, status, relatedType, customer, lead, opportunity, assignedTo } = req.body;

    if (!type || !['Call', 'Meeting', 'Email', 'Task'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Valid activity type is required (Call, Meeting, Email, Task).' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!activityDate) {
      return res.status(400).json({ success: false, message: 'Activity date is required.' });
    }

    const assignedUser = assignedTo || req.user._id;

    const activity = await Activity.create({
      type,
      subject: subject.trim(),
      description: description ? description.trim() : '',
      activityDate: new Date(activityDate),
      status: status || 'Planned',
      relatedType: relatedType || 'Customer',
      customer: customer || null,
      lead: lead || null,
      opportunity: opportunity || null,
      assignedTo: assignedUser,
      createdBy: req.user._id
    });

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE',
      entityName: 'Activity',
      recordId: activity._id,
      newValue: activity,
      req
    });

    const populated = await Activity.findById(activity._id)
      .populate('customer', 'customerCode customerName')
      .populate('lead', 'leadCode leadName')
      .populate('opportunity', 'opportunityCode title')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      activity.assignedTo.toString() !== req.user._id.toString() &&
      activity.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to edit this activity.' });
    }

    const oldData = activity.toObject();
    const { type, subject, description, activityDate, status, relatedType, customer, lead, opportunity, assignedTo } = req.body;

    if (type && ['Call', 'Meeting', 'Email', 'Task'].includes(type)) activity.type = type;
    if (subject) activity.subject = subject.trim();
    if (description !== undefined) activity.description = description.trim();
    if (activityDate) activity.activityDate = new Date(activityDate);
    if (status && ['Planned', 'Completed', 'Cancelled'].includes(status)) activity.status = status;
    if (relatedType) activity.relatedType = relatedType;
    if (customer !== undefined) activity.customer = customer || null;
    if (lead !== undefined) activity.lead = lead || null;
    if (opportunity !== undefined) activity.opportunity = opportunity || null;
    if (assignedTo && req.user.role !== 'SalesExecutive') activity.assignedTo = assignedTo;

    await activity.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE',
      entityName: 'Activity',
      recordId: activity._id,
      oldValue: oldData,
      newValue: activity,
      req
    });

    const populated = await Activity.findById(activity._id)
      .populate('customer', 'customerCode customerName')
      .populate('lead', 'leadCode leadName')
      .populate('opportunity', 'opportunityCode title')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    if (
      req.user.role === 'SalesExecutive' &&
      activity.assignedTo.toString() !== req.user._id.toString() &&
      activity.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied to delete this activity.' });
    }

    const oldData = activity.toObject();
    await Activity.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE',
      entityName: 'Activity',
      recordId: activity._id,
      oldValue: oldData,
      req
    });

    res.status(200).json({ success: true, message: 'Activity deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity
};

