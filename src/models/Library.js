const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Library name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Library code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true
    },
    city: {
      type: String,
      default: 'Mira-Bhayandar',
      trim: true
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    operatingHours: {
      type: String,
      default: '09:00 AM - 08:00 PM'
    },
    deliveryAvailable: {
      type: Boolean,
      default: true
    },
    baseDeliveryFee: {
      type: Number,
      default: 20,
      min: 0
    },
    perKmFee: {
      type: Number,
      default: 5,
      min: 0
    },
    sampleDistanceKm: {
      type: Number,
      default: 2.0
    },
    isDemo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

librarySchema.index({ area: 1, city: 1 });

module.exports = mongoose.model('Library', librarySchema);
