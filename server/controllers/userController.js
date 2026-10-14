const User = require('../models/User');
const createAuditLog = require('../utils/auditLogger');

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isStrongPassword = (password) => {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      password,
      role: role || 'SalesExecutive'
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE',
      entityName: 'User',
      recordId: newUser._id,
      newValue: userObj,
      req
    });

    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const oldData = user.toObject();
    delete oldData.password;

    const { name, email, phone, role, isActive, password } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role && ['Admin', 'Manager', 'SalesExecutive'].includes(role)) {
      user.role = role;
    }
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      }
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Email is already in use.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (password) {
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
        });
      }
      user.password = password;
    }

    await user.save();

    const updatedObj = user.toObject();
    delete updatedObj.password;

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE',
      entityName: 'User',
      recordId: user._id,
      oldValue: oldData,
      newValue: updatedObj,
      req
    });

    res.status(200).json({ success: true, data: updatedObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const oldStatus = user.isActive;
    user.isActive = !user.isActive;
    await user.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'STATUS_CHANGE',
      entityName: 'User',
      recordId: user._id,
      oldValue: { isActive: oldStatus },
      newValue: { isActive: user.isActive },
      req
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ success: true, data: userObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const oldValues = {
      failedLoginAttempts: user.failedLoginAttempts,
      lockUntil: user.lockUntil
    };

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UNLOCK',
      entityName: 'User',
      recordId: user._id,
      oldValue: oldValues,
      newValue: { failedLoginAttempts: 0, lockUntil: null },
      req
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ success: true, message: 'User account unlocked successfully.', data: userObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const deletedData = user.toObject();
    delete deletedData.password;

    await User.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE',
      entityName: 'User',
      recordId: user._id,
      oldValue: deletedData,
      req
    });

    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  unlockUser,
  deleteUser
};

