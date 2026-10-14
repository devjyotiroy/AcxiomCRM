const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    opportunityCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required']
    },
    stage: {
      type: String,
      enum: ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      default: 'Qualification'
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      default: 0
    },
    probability: {
      type: Number,
      required: [true, 'Probability is required'],
      min: 0,
      max: 100,
      default: 20
    },
    expectedCloseDate: {
      type: Date,
      required: [true, 'Expected close date is required']
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
    createdDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);

