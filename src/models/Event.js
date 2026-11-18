const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    eventType: {
      type: String,
      enum: ['Reading Club', 'Book Discussion', 'Storytelling Session', 'Writing Workshop', 'Community Reading Event'],
      required: [true, 'Event type is required'],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Event description is required']
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      index: true
    },
    time: {
      type: String,
      required: [true, 'Event time is required'],
      trim: true
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      default: null
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    area: {
      type: String,
      default: 'Mira Road',
      trim: true
    },
    coordinates: {
      latitude: { type: Number, default: 19.2812 },
      longitude: { type: Number, default: 72.8561 }
    },
    sampleDistanceKm: {
      type: Number,
      default: 1.5
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
      default: 30
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
      default: 30
    },
    speakerOrHost: {
      type: String,
      trim: true
    },
    bannerImage: {
      type: String,
      default: ''
    },
    isDemo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
