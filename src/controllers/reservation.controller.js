const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const Library = require('../models/Library');
const BookCopy = require('../models/BookCopy');
const User = require('../models/User');
const { calculateDeliveryCharge } = require('../utils/haversine');

// @desc    Create a new book reservation
// @route   POST /api/reservations
exports.createReservation = async (req, res, next) => {
  try {
    const {
      bookId,
      libraryId,
      userName,
      userEmail,
      userPhone,
      fulfillmentType,
      deliveryAddress,
      deliveryNotes,
      distanceKm
    } = req.body;

    // 1. Validation
    if (!bookId || !libraryId || !userName || !userEmail || !userPhone || !fulfillmentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required reservation fields: bookId, libraryId, userName, userEmail, userPhone, and fulfillmentType are required.'
      });
    }

    if (fulfillmentType === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for home delivery reservations.'
      });
    }

    // 2. Fetch book and library
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    // 3. Prevent duplicate active reservation for the exact same book & user within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDuplicate = await Reservation.findOne({
      book: bookId,
      userEmail: userEmail.toLowerCase().trim(),
      reservedAt: { $gte: fiveMinutesAgo },
      status: { $in: ['Pending', 'Confirmed', 'Ready for Pickup'] }
    });

    if (recentDuplicate) {
      return res.status(400).json({
        success: false,
        message: `You already have an active reservation for "${book.title}" placed moments ago (${recentDuplicate.reservationNumber}).`
      });
    }

    // 4. Find available physical copy at this specific library
    const availableCopy = await BookCopy.findOne({
      book: bookId,
      library: libraryId,
      status: 'available'
    });

    if (!availableCopy) {
      return res.status(400).json({
        success: false,
        message: `Sorry, "${book.title}" is currently out of stock at ${library.name}. Please select another branch.`
      });
    }

    // 5. Calculate delivery fee
    const dist = distanceKm || library.sampleDistanceKm || 2.0;
    const deliveryFee = fulfillmentType === 'delivery'
      ? calculateDeliveryCharge(dist, library.baseDeliveryFee, library.perKmFee)
      : 0;

    // 6. Generate unique reservation number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reservationNumber = `RES-${datePrefix}-${randomSuffix}`;

    // 7. Atomic reservation: reserve copy and update book stock count
    availableCopy.status = 'reserved';
    await availableCopy.save();

    await Book.findByIdAndUpdate(bookId, {
      $inc: { availableCopiesCount: -1 }
    });

    // 8. Create reservation record
    // Try to link to authenticated user by userId or email
    let linkedUserId = null;
    if (req.body.userId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(req.body.userId)) {
        linkedUserId = req.body.userId;
      }
    }
    if (!linkedUserId) {
      // Try to find by email to auto-link existing accounts
      const matchedUser = await User.findOne({ email: userEmail.toLowerCase().trim() });
      if (matchedUser) linkedUserId = matchedUser._id;
    }

    const reservation = await Reservation.create({
      reservationNumber,
      user: linkedUserId,
      userName: userName.trim(),
      userEmail: userEmail.toLowerCase().trim(),
      userPhone: userPhone.trim(),
      book: book._id,
      bookTitle: book.title,
      library: library._id,
      libraryName: library.name,
      bookCopy: availableCopy._id,
      fulfillmentType,
      deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress.trim() : '',
      deliveryNotes: deliveryNotes ? deliveryNotes.trim() : '',
      distanceKm: dist,
      deliveryFee,
      status: 'Confirmed',
      isDemo: !linkedUserId
    });

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully!',
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get reservations (optionally filtered by user email or status)
// @route   GET /api/reservations
exports.getReservations = async (req, res, next) => {
  try {
    const { email, status, libraryId } = req.query;
    const filter = {};

    if (email) filter.userEmail = email.toLowerCase().trim();
    if (status) filter.status = status;
    if (libraryId) filter.library = libraryId;

    const reservations = await Reservation.find(filter)
      .populate('book')
      .populate('library')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get reservation by ID or reservation number
// @route   GET /api/reservations/:id
exports.getReservationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let reservation;

    if (id.startsWith('RES-')) {
      reservation = await Reservation.findOne({ reservationNumber: id })
        .populate('book')
        .populate('library');
    } else {
      reservation = await Reservation.findById(id)
        .populate('book')
        .populate('library');
    }

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    res.json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

// @desc    Update reservation status
// @route   PATCH /api/reservations/:id/status
exports.updateReservationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const oldStatus = reservation.status;
    reservation.status = status;
    await reservation.save();

    // If cancelled, free up the assigned physical copy and increment available count
    if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
      if (reservation.bookCopy) {
        await BookCopy.findByIdAndUpdate(reservation.bookCopy, { status: 'available' });
      }
      await Book.findByIdAndUpdate(reservation.book, {
        $inc: { availableCopiesCount: 1 }
      });
    }

    res.json({
      success: true,
      message: `Reservation status updated to "${status}"`,
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

