const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Follow-up title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    followUpDate: {
      type: Date,
      required: [true, 'Follow-up date is required']
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    relatedType: {
      type: String,
      enum: ['Customer', 'Lead'],
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
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
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('FollowUp', followUpSchema);

