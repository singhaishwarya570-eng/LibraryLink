const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required'],
      index: true
    },
    eventTitle: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    userEmail: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    userPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Confirmed', 'Cancelled'],
      default: 'Confirmed'
    },
    isDemo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate registrations for same event with same email
eventRegistrationSchema.index({ event: 1, userEmail: 1 }, { unique: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
