const ReadingProgress = require('../models/ReadingProgress');
const User = require('../models/User');

// Helper to auto-associate existing records with user accounts
const autoAssociateUser = async (progress) => {
  if (progress && !progress.user && progress.userEmail) {
    const user = await User.findOne({ email: progress.userEmail.toLowerCase().trim() });
    if (user) {
      progress.user = user._id;
      await progress.save();
    }
  }
  return progress;
};

// @desc    Get current authenticated user's reading progress
// @route   GET /api/reading-progress/me
exports.getMyProgress = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email.toLowerCase().trim();

    let progress = await ReadingProgress.findOne({
      $or: [{ user: userId }, { userEmail: userEmail }]
    });

    if (progress) {
      // Ensure user ID is linked
      if (!progress.user) {
        progress.user = userId;
        await progress.save();
      }
    } else {
      // Automatically create a new distinct reading challenge profile for this user
      progress = await ReadingProgress.create({
        user: userId,
        userEmail: userEmail,
        userName: req.user.name,
        yearlyGoal: 12,
        booksCompleted: 0,
        completedBookList: [],
        currentStreakDays: 1,
        totalReadingMinutes: 0,
        isDemo: false
      });
    }

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's reading challenge progress by query or list readers
// @route   GET /api/reading-progress
exports.getProgress = async (req, res, next) => {
  try {
    const { email, userEmail, userId } = req.query;
    const targetEmail = (email || userEmail || '').toLowerCase().trim();

    if (userId) {
      const progress = await ReadingProgress.findOne({
        $or: [{ user: userId }, { _id: userId }]
      });
      if (!progress) {
        return res.status(404).json({ success: false, message: 'No reading progress found for this user ID' });
      }
      await autoAssociateUser(progress);
      return res.json({ success: true, data: progress });
    }

    if (targetEmail) {
      const progress = await ReadingProgress.findOne({ userEmail: targetEmail });
      if (!progress) {
        return res.status(404).json({ success: false, message: 'No reading progress found for this email' });
      }
      await autoAssociateUser(progress);
      return res.json({ success: true, data: progress });
    }

    // If authenticated via optionalAuth and no query, return their own profile
    if (req.user) {
      return exports.getMyProgress(req, res, next);
    }

    // Default: return community leaderboard / recent participants (protecting sensitive info)
    const allProgress = await ReadingProgress.find()
      .select('userName booksCompleted yearlyGoal currentStreakDays totalReadingMinutes createdAt')
      .sort({ booksCompleted: -1 });

    res.json({ success: true, count: allProgress.length, data: allProgress });
  } catch (err) {
    next(err);
  }
};

// @desc    Get community reading challenge aggregate statistics
// @route   GET /api/reading-progress/community-stats
exports.getCommunityStats = async (req, res, next) => {
  try {
    const records = await ReadingProgress.find();

    const totalReaders = records.length;
    const totalBooksCompleted = records.reduce((sum, r) => sum + (r.booksCompleted || 0), 0);
    const totalReadingMinutes = records.reduce((sum, r) => sum + (r.totalReadingMinutes || 0), 0);
    const avgGoal = totalReaders > 0
      ? Math.round(records.reduce((sum, r) => sum + (r.yearlyGoal || 12), 0) / totalReaders)
      : 12;

    res.json({
      success: true,
      data: {
        totalReaders,
        totalBooksCompleted,
        totalReadingMinutes,
        totalReadingHours: Math.round(totalReadingMinutes / 60),
        averageYearlyGoal: avgGoal,
        topReaders: records.slice(0, 5).map(r => ({
          userName: r.userName,
          booksCompleted: r.booksCompleted,
          yearlyGoal: r.yearlyGoal,
          streak: r.currentStreakDays
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create or initialize reading progress profile
// @route   POST /api/reading-progress
exports.createProgress = async (req, res, next) => {
  try {
    const { userEmail, userName, yearlyGoal = 12, userId } = req.body;

    const emailNorm = (userEmail || (req.user && req.user.email) || '').toLowerCase().trim();
    const nameNorm = (userName || (req.user && req.user.name) || '').trim();

    if (!emailNorm || !nameNorm) {
      return res.status(400).json({ success: false, message: 'Email and name are required' });
    }

    // Check if user already has a progress record
    let resolvedUserId = userId || (req.user ? req.user._id : null);
    if (!resolvedUserId) {
      const matchedUser = await User.findOne({ email: emailNorm });
      if (matchedUser) resolvedUserId = matchedUser._id;
    }

    let progress = await ReadingProgress.findOne({
      $or: [
        ...(resolvedUserId ? [{ user: resolvedUserId }] : []),
        { userEmail: emailNorm }
      ]
    });

    if (progress) {
      if (resolvedUserId && !progress.user) {
        progress.user = resolvedUserId;
        await progress.save();
      }
      return res.json({
        success: true,
        message: 'Profile already exists. Returning current progress.',
        data: progress
      });
    }

    progress = await ReadingProgress.create({
      user: resolvedUserId || null,
      userEmail: emailNorm,
      userName: nameNorm,
      yearlyGoal: parseInt(yearlyGoal) || 12,
      booksCompleted: 0,
      completedBookList: [],
      currentStreakDays: 1,
      totalReadingMinutes: 60,
      isDemo: !resolvedUserId
    });

    res.status(201).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// @desc    Add completed book or update reading goal
// @route   PUT /api/reading-progress/update
exports.updateProgress = async (req, res, next) => {
  try {
    const { userEmail, bookTitle, author, category, rating, notes, yearlyGoal } = req.body;

    // Determine target record based on auth first, then userEmail
    let progress;

    if (req.user) {
      progress = await ReadingProgress.findOne({
        $or: [{ user: req.user._id }, { userEmail: req.user.email.toLowerCase() }]
      });

      if (!progress) {
        progress = await ReadingProgress.create({
          user: req.user._id,
          userEmail: req.user.email.toLowerCase(),
          userName: req.user.name,
          yearlyGoal: yearlyGoal || 12,
          booksCompleted: 0,
          completedBookList: [],
          currentStreakDays: 1,
          totalReadingMinutes: 0,
          isDemo: false
        });
      }
    } else if (userEmail) {
      const emailNorm = userEmail.toLowerCase().trim();
      progress = await ReadingProgress.findOne({ userEmail: emailNorm });

      if (!progress) {
        const matchedUser = await User.findOne({ email: emailNorm });
        progress = await ReadingProgress.create({
          user: matchedUser ? matchedUser._id : null,
          userEmail: emailNorm,
          userName: matchedUser ? matchedUser.name : userEmail.split('@')[0],
          yearlyGoal: yearlyGoal || 12,
          booksCompleted: 0,
          completedBookList: [],
          currentStreakDays: 1,
          totalReadingMinutes: 60,
          isDemo: true
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Authentication or user email is required' });
    }

    if (yearlyGoal) {
      progress.yearlyGoal = parseInt(yearlyGoal);
    }

    if (bookTitle && author) {
      progress.completedBookList.unshift({
        bookTitle: bookTitle.trim(),
        author: author.trim(),
        category: category || 'General',
        rating: rating ? parseInt(rating) : 5,
        notes: notes ? notes.trim() : '',
        completedDate: new Date()
      });
      progress.booksCompleted = progress.completedBookList.length;
      progress.totalReadingMinutes = (progress.totalReadingMinutes || 0) + 240; // Approx 4 hours per book
      progress.currentStreakDays = (progress.currentStreakDays || 0) + 1;
    }

    await progress.save();

    res.json({
      success: true,
      message: 'Reading progress updated successfully!',
      data: progress
    });
  } catch (err) {
    next(err);
  }
};
