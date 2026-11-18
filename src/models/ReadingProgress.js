const mongoose = require('mongoose');

const completedBookSchema = new mongoose.Schema({
  bookTitle: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  completedDate: {
    type: Date,
    default: Date.now
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  notes: {
    type: String,
    trim: true
  }
});

const readingProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    yearlyGoal: {
      type: Number,
      required: true,
      default: 12,
      min: 1
    },
    booksCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    completedBookList: [completedBookSchema],
    currentStreakDays: {
      type: Number,
      default: 1
    },
    totalReadingMinutes: {
      type: Number,
      default: 0
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
