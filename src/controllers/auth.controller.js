const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');

const JWT_SECRET = process.env.JWT_SECRET || 'librarylink_super_secure_jwt_secret_key_2026';

// Helper to sign JWT token
const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Register a new user account
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, phone, address } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // 3. Validate password length & confirmation
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // 4. Check for existing account
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // 5. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : ''
    });

    // 7. Generate authentication token
    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Sign in user with email & password
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check by clean email, also accommodating potential domain typo like collegeemail.edu vs collegemail.edu
    let user = await User.findOne({ email: cleanEmail });
    if (!user && (cleanEmail === 'rohan.sharma@collegeemail.edu' || cleanEmail === 'rohan.sharma@collegemail.edu')) {
      user = await User.findOne({ email: { $in: ['rohan.sharma@collegemail.edu', 'rohan.sharma@collegeemail.edu'] } });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get currently authenticated user's profile
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Also count their active reservations
    const totalReservations = await Reservation.countDocuments({
      $or: [{ user: user._id }, { userEmail: user.email.toLowerCase() }]
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        totalReservations,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get personal reservations for currently authenticated user
// @route   GET /api/auth/my-reservations
exports.getMyReservations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email.toLowerCase();

    // Query reservations by user ID or user email
    const reservations = await Reservation.find({
      $or: [{ user: userId }, { userEmail: userEmail }]
    })
      .populate('book', 'title author coverImage isbn category')
      .populate('library', 'name code address contactNumber operatingHours')
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

// @desc    Cancel a personal reservation
// @route   PATCH /api/auth/my-reservations/:id/cancel
exports.cancelMyReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userEmail = req.user.email.toLowerCase();

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    // Verify ownership
    const isOwner =
      (reservation.user && reservation.user.toString() === userId.toString()) ||
      reservation.userEmail.toLowerCase() === userEmail;

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify another user’s reservation.'
      });
    }

    if (reservation.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This reservation is already cancelled.'
      });
    }

    if (reservation.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed reservations cannot be cancelled.'
      });
    }

    const oldStatus = reservation.status;
    reservation.status = 'Cancelled';
    await reservation.save();

    // Free up book copy in inventory if reserved
    if (reservation.bookCopy) {
      await BookCopy.findByIdAndUpdate(reservation.bookCopy, { status: 'available' });
    }
    await Book.findByIdAndUpdate(reservation.book, {
      $inc: { availableCopiesCount: 1 }
    });

    res.json({
      success: true,
      message: 'Reservation cancelled successfully and stock replenished.',
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};
