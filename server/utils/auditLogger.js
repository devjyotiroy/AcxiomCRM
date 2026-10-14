const AuditLog = require('../models/AuditLog');

const sanitizeData = (data) => {
  if (!data) return null;
  const clone = typeof data.toObject === 'function' ? data.toObject() : JSON.parse(JSON.stringify(data));
  if (clone.password) delete clone.password;
  if (clone.token) delete clone.token;
  return clone;
};

const createAuditLog = async ({ userId, userEmail, action, entityName, recordId, oldValue, newValue, req }) => {
  try {
    let ipAddress = '';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    }

    await AuditLog.create({
      userId: userId || null,
      userEmail: userEmail || '',
      action,
      entityName,
      recordId: recordId ? String(recordId) : '',
      oldValue: sanitizeData(oldValue),
      newValue: sanitizeData(newValue),
      ipAddress
    });
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
  }
};

module.exports = createAuditLog;

