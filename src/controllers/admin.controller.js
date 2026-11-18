const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Book = require('../models/Book');
const Library = require('../models/Library');
const BookCopy = require('../models/BookCopy');
const Reservation = require('../models/Reservation');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const ReadingProgress = require('../models/ReadingProgress');

// @desc    Admin login
// @route   POST /api/admin/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin role required'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'librarylink_super_secure_jwt_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalBooks,
      totalCopies,
      availableCopies,
      totalLibraries,
      totalReservations,
      pendingReservations,
      confirmedReservations,
      readyReservations,
      completedReservations,
      totalEvents,
      totalRegistrations,
      totalReaders
    ] = await Promise.all([
      Book.countDocuments(),
      BookCopy.countDocuments(),
      BookCopy.countDocuments({ status: 'available' }),
      Library.countDocuments(),
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: 'Pending' }),
      Reservation.countDocuments({ status: 'Confirmed' }),
      Reservation.countDocuments({ status: 'Ready for Pickup' }),
      Reservation.countDocuments({ status: 'Completed' }),
      Event.countDocuments(),
      EventRegistration.countDocuments(),
      ReadingProgress.countDocuments()
    ]);

    const recentReservations = await Reservation.find()
      .populate('book', 'title')
      .populate('library', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        inventory: {
          totalBooks,
          totalCopies,
          availableCopies,
          reservedOrIssued: totalCopies - availableCopies,
          totalLibraries
        },
        reservations: {
          total: totalReservations,
          pending: pendingReservations,
          confirmed: confirmedReservations,
          readyForPickup: readyReservations,
          completed: completedReservations,
          recent: recentReservations
        },
        events: {
          total: totalEvents,
          totalRegistrations
        },
        community: {
          totalReaders
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a book copy to a library
// @route   POST /api/admin/inventory/copies
exports.addBookCopy = async (req, res, next) => {
  try {
    const { bookId, libraryId, rackLocation, condition = 'Good' } = req.body;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    const library = await Library.findById(libraryId);
    if (!library) return res.status(404).json({ success: false, message: 'Library not found' });

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const copyBarcode = `BC-${library.code}-${randomSuffix}`;

    const copy = await BookCopy.create({
      book: book._id,
      library: library._id,
      copyBarcode,
      status: 'available',
      condition,
      rackLocation: rackLocation || 'Main Shelf',
      isDemo: true
    });

    await Book.findByIdAndUpdate(bookId, {
      $inc: { totalCopiesCount: 1, availableCopiesCount: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Book copy registered in library inventory',
      data: copy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all book copies (Inventory list)
// @route   GET /api/admin/inventory/copies
exports.getBookCopies = async (req, res, next) => {
  try {
    const { bookId, libraryId, status } = req.query;
    const filter = {};
    if (bookId) filter.book = bookId;
    if (libraryId) filter.library = libraryId;
    if (status) filter.status = status;

    const copies = await BookCopy.find(filter)
      .populate('book', 'title author isbn category coverImage')
      .populate('library', 'name code area')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: copies.length,
      data: copies
    });
  } catch (err) {
    next(err);
  }
};
