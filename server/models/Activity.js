const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Call', 'Meeting', 'Email', 'Task'],
      required: [true, 'Activity type is required']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    activityDate: {
      type: Date,
      required: [true, 'Activity date is required']
    },
    status: {
      type: String,
      enum: ['Planned', 'Completed', 'Cancelled'],
      default: 'Planned'
    },
    relatedType: {
      type: String,
      enum: ['Customer', 'Lead', 'Opportunity'],
      default: 'Customer'
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
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Activity', activitySchema);

