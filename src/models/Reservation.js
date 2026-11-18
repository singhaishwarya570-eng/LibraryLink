const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    reservationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      lowercase: true,
      trim: true
    },
    userPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book is required']
    },
    bookTitle: {
      type: String,
      required: true
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: [true, 'Library is required']
    },
    libraryName: {
      type: String,
      required: true
    },
    bookCopy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookCopy',
      default: null
    },
    fulfillmentType: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: [true, 'Fulfillment type (pickup or delivery) is required']
    },
    deliveryAddress: {
      type: String,
      trim: true
    },
    deliveryNotes: {
      type: String,
      trim: true
    },
    distanceKm: {
      type: Number,
      default: 0
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    reservedAt: {
      type: Date,
      default: Date.now
    },
    isDemo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

reservationSchema.index({ userEmail: 1, status: 1 });
reservationSchema.index({ library: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
