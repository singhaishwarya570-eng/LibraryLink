const mongoose = require('mongoose');

const bookCopySchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required'],
      index: true
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: [true, 'Library reference is required'],
      index: true
    },
    copyBarcode: {
      type: String,
      required: [true, 'Barcode is required'],
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'issued', 'damaged', 'lost', 'maintenance'],
      default: 'available',
      index: true
    },
    condition: {
      type: String,
      enum: ['New', 'Good', 'Fair', 'Damaged'],
      default: 'Good'
    },
    rackLocation: {
      type: String,
      trim: true,
      default: 'Shelf A'
    },
    isDemo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

bookCopySchema.index({ book: 1, library: 1, status: 1 });

module.exports = mongoose.model('BookCopy', bookCopySchema);
