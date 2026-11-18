const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      index: true
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      index: true
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    coverImage: {
      type: String,
      required: [true, 'Cover image path is required']
    },
    publishedYear: {
      type: Number,
      min: 1800,
      max: 2100
    },
    publisher: {
      type: String,
      trim: true
    },
    totalCopiesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    availableCopiesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isDemo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', category: 'text' });

module.exports = mongoose.model('Book', bookSchema);
