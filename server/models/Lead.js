const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    leadCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    leadName: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    companyName: {
      type: String,
      default: '',
      trim: true
    },
    source: {
      type: String,
      enum: ['Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Other'],
      default: 'Website'
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'],
      default: 'New'
    },
    expectedValue: {
      type: Number,
      default: 0
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    convertedCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    convertedOpportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null
    },
    createdDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Lead', leadSchema);

