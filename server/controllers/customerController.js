const Customer = require('../models/Customer');
const createAuditLog = require('../utils/auditLogger');

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const generateCustomerCode = async () => {
  const count = await Customer.countDocuments();
  return `CUST-${String(count + 1).padStart(4, '0')}`;
};

const getCustomers = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'SalesExecutive') {
      query.createdBy = req.user._id;
    }

    const { search, status } = req.query;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { customerName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { companyName: searchRegex },
        { customerCode: searchRegex }
      ];
    }

    if (status) {
      query.status = status;
    }

    const customers = await Customer.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('createdBy', 'name email role');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (req.user.role === 'SalesExecutive' && customer.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this customer record.' });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { customerName, email, phone, companyName, address, city, state, status, customerCode } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (customerName.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Customer name cannot exceed 100 characters.' });
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

    const existingEmail = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Customer with this email already exists.' });
    }

    const existingPhone = await Customer.findOne({ phone: phone.trim() });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Customer with this phone number already exists.' });
    }

    let code = customerCode ? customerCode.trim().toUpperCase() : await generateCustomerCode();

    const existingCode = await Customer.findOne({ customerCode: code });
    if (existingCode) {
      code = await generateCustomerCode();
    }

    const customer = await Customer.create({
      customerCode: code,
      customerName: customerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      companyName: companyName ? companyName.trim() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      status: status || 'Active',
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

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (req.user.role === 'SalesExecutive' && customer.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to edit this customer.' });
    }

    const oldData = customer.toObject();
    const { customerName, email, phone, companyName, address, city, state, status } = req.body;

    if (customerName) {
      if (customerName.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'Customer name cannot exceed 100 characters.' });
      }
      customer.customerName = customerName.trim();
    }

    if (email && email.toLowerCase().trim() !== customer.email) {
      if (!isValidEmail(email.trim())) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      }
      const existingEmail = await Customer.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: customer._id }
      });
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'Customer with this email already exists.' });
      }
      customer.email = email.toLowerCase().trim();
    }

    if (phone && phone.trim() !== customer.phone) {
      if (!isValidPhone(phone.trim())) {
        return res.status(400).json({ success: false, message: 'Enter a valid phone number.' });
      }
      const existingPhone = await Customer.findOne({
        phone: phone.trim(),
        _id: { $ne: customer._id }
      });
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'Customer with this phone number already exists.' });
      }
      customer.phone = phone.trim();
    }

    if (companyName !== undefined) customer.companyName = companyName.trim();
    if (address !== undefined) customer.address = address.trim();
    if (city !== undefined) customer.city = city.trim();
    if (state !== undefined) customer.state = state.trim();
    if (status && ['Active', 'Inactive'].includes(status)) customer.status = status;

    await customer.save();

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE',
      entityName: 'Customer',
      recordId: customer._id,
      oldValue: oldData,
      newValue: customer,
      req
    });

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (req.user.role === 'SalesExecutive' && customer.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to delete this customer.' });
    }

    const oldData = customer.toObject();
    await Customer.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE',
      entityName: 'Customer',
      recordId: customer._id,
      oldValue: oldData,
      req
    });

    res.status(200).json({ success: true, message: 'Customer deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};

