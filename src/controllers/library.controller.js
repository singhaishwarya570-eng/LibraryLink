const Library = require('../models/Library');
const BookCopy = require('../models/BookCopy');

// @desc    Get all libraries
// @route   GET /api/libraries
exports.getLibraries = async (req, res, next) => {
  try {
    const libraries = await Library.find().sort({ name: 1 });

    // Enhance each library with current copy count
    const enrichedLibraries = await Promise.all(
      libraries.map(async (lib) => {
        const totalCopies = await BookCopy.countDocuments({ library: lib._id });
        const availableCopies = await BookCopy.countDocuments({ library: lib._id, status: 'available' });

        return {
          ...lib.toObject(),
          totalCopies,
          availableCopies
        };
      })
    );

    res.json({
      success: true,
      count: enrichedLibraries.length,
      data: enrichedLibraries
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single library by ID
// @route   GET /api/libraries/:id
exports.getLibraryById = async (req, res, next) => {
  try {
    const library = await Library.findById(req.params.id);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    const copies = await BookCopy.find({ library: req.params.id, status: 'available' })
      .populate('book')
      .limit(20);

    res.json({
      success: true,
      data: {
        ...library.toObject(),
        availableBooksSample: copies.map((c) => c.book).filter(Boolean)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create library (Admin only)
// @route   POST /api/libraries
exports.createLibrary = async (req, res, next) => {
  try {
    const { name, code, address, area, city, contactNumber, email, coordinates, operatingHours, deliveryAvailable, baseDeliveryFee, perKmFee } = req.body;

    const existing = await Library.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Library code ${code} already in use` });
    }

    const library = await Library.create({
      name,
      code: code.toUpperCase(),
      address,
      area,
      city: city || 'Mira-Bhayandar',
      contactNumber,
      email,
      coordinates: coordinates || { latitude: 19.2812, longitude: 72.8561 },
      operatingHours,
      deliveryAvailable: deliveryAvailable !== undefined ? deliveryAvailable : true,
      baseDeliveryFee: baseDeliveryFee || 20,
      perKmFee: perKmFee || 5,
      isDemo: true
    });

    res.status(201).json({ success: true, data: library });
  } catch (err) {
    next(err);
  }
};

// @desc    Update library (Admin only)
// @route   PUT /api/libraries/:id
exports.updateLibrary = async (req, res, next) => {
  try {
    const library = await Library.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    res.json({ success: true, data: library });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete library (Admin only)
// @route   DELETE /api/libraries/:id
exports.deleteLibrary = async (req, res, next) => {
  try {
    const library = await Library.findById(req.params.id);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    await BookCopy.deleteMany({ library: req.params.id });
    await library.deleteOne();

    res.json({ success: true, message: 'Library and related book copy records removed' });
  } catch (err) {
    next(err);
  }
};
