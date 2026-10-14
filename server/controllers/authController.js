const User = require('../models/User');
const sendTokenResponse = require('../utils/generateToken');
const createAuditLog = require('../utils/auditLogger');

const isStrongPassword = (password) => {
  // min 8 chars,at least 1 uppercase,at least 1 lowercase,at least 1 number
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
};

// function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    //check required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    //email format validation
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }

    //pssword policy validation
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      });
    }

    //check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const countUsers = await User.countDocuments();
    let assignedRole = role || 'SalesExecutive';
    if (countUsers === 0) {
      assignedRole = 'Admin';
    }

    //create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      password,
      role: assignedRole
    });

    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'REGISTER',
      entityName: 'User',
      recordId: user._id,
      newValue: { name: user.name, email: user.email, role: user.role },
      req
    });

    //sennd token in httpOnly cookie
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      await createAuditLog({
        userEmail: email.toLowerCase().trim(),
        action: 'FAILED_LOGIN',
        entityName: 'Auth',
        newValue: { reason: 'User not found' },
        req
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to 5 failed attempts. Please try again in ${minutesLeft} minute(s).`
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an Administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await createAuditLog({
        userId: user._id,
        userEmail: user.email,
        action: 'FAILED_LOGIN',
        entityName: 'Auth',
        recordId: user._id,
        newValue: { attempts: user.failedLoginAttempts },
        req
      });

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        return res.status(403).json({
          success: false,
          message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
        });
      }

      await user.save();
      const remaining = 5 - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`
      });
    }
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'LOGIN',
      entityName: 'Auth',
      recordId: user._id,
      newValue: { role: user.role },
      req
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
};
const logout = async (req, res) => {
try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe
};