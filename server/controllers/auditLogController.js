const AuditLog = require('../models/AuditLog');

const getAuditLogs = async (req, res) => {
  try {
    const { userId, action, entityName, startDate, endDate, search } = req.query;
    let query = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (entityName) query.entityName = entityName;

    if (startDate || endDate) {
      query.createdDate = {};
      if (startDate) query.createdDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdDate.$lte = end;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { userEmail: searchRegex },
        { action: searchRegex },
        { entityName: searchRegex },
        { recordId: searchRegex }
      ];
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdDate: -1 })
      .limit(200);

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuditLogs
};

