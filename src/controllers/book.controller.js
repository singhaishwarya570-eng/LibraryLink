const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const Library = require('../models/Library');
const { calculateDistance, calculateDeliveryCharge } = require('../utils/haversine');

// Helper to sanitize title to safe filename slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .slice(0, 50);
};

// Helper: Download remote cover image and store in public/images/books/
const downloadAndSaveCover = async (remoteUrl, filenameBase) => {
  try {
    const targetDir = path.join(__dirname, '../../public/images/books');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `${filenameBase}.jpg`;
    const destPath = path.join(targetDir, filename);

    // Timeout fetch after 7 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If buffer is too small (e.g. 1x1 tracking pixel or missing image)
    if (buffer.length < 1500) return null;

    fs.writeFileSync(destPath, buffer);
    return `/images/books/${filename}`;
  } catch (err) {
    console.warn(`Cover download error for ${remoteUrl}:`, err.message);
    return null;
  }
};

// @desc    Lookup book cover automatically by ISBN and/or Title
// @route   GET /api/books/cover-lookup
exports.lookupBookCover = async (req, res, next) => {
  try {
    const { isbn, title } = req.query;

    const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';
    const cleanTitle = title ? title.trim() : '';

    if (!cleanIsbn && !cleanTitle) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either an ISBN or book title for cover lookup.'
      });
    }

    // Step 1: Search by ISBN first using Open Library & Google Books
    if (cleanIsbn) {
      // 1A. Open Library Books API
      try {
        const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&data=extras`;
        const olRes = await fetch(olUrl);
        if (olRes.ok) {
          const olData = await olRes.json();
          const bookData = olData[`ISBN:${cleanIsbn}`];
          if (bookData && bookData.thumbnail_url) {
            const largeCover = bookData.thumbnail_url.replace('-S.jpg', '-L.jpg');
            return res.json({
              success: true,
              found: true,
              source: 'Open Library (ISBN)',
              coverUrl: largeCover
            });
          }
        }
      } catch (e) {
        console.warn('Open Library ISBN error:', e.message);
      }

      // 1B. Direct Open Library ISBN cover check
      try {
        const directUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
        const headRes = await fetch(directUrl, { method: 'HEAD' });
        if (headRes.ok) {
          return res.json({
            success: true,
            found: true,
            source: 'Open Library (Direct ISBN)',
            coverUrl: `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`
          });
        }
      } catch (e) {
        console.warn('Open Library Direct ISBN error:', e.message);
      }

      // 1C. Google Books API by ISBN
      try {
        const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`;
        const gbRes = await fetch(gbUrl);
        if (gbRes.ok) {
          const gbData = await gbRes.json();
          if (gbData.items && gbData.items[0]?.volumeInfo?.imageLinks) {
            const images = gbData.items[0].volumeInfo.imageLinks;
            const cover = (images.extraLarge || images.large || images.medium || images.thumbnail || '')
              .replace('http://', 'https://');
            if (cover) {
              return res.json({
                success: true,
                found: true,
                source: 'Google Books (ISBN)',
                coverUrl: cover
              });
            }
          }
        }
      } catch (e) {
        console.warn('Google Books ISBN error:', e.message);
      }
    }

    // Step 2: Fallback to searching by book title
    if (cleanTitle) {
      // 2A. Open Library Title Search
      try {
        const olSearchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&limit=1`;
        const olSearchRes = await fetch(olSearchUrl);
        if (olSearchRes.ok) {
          const searchData = await olSearchRes.json();
          if (searchData.docs && searchData.docs[0]?.cover_i) {
            const coverId = searchData.docs[0].cover_i;
            return res.json({
              success: true,
              found: true,
              source: 'Open Library (Title Match)',
              coverUrl: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
            });
          }
        }
      } catch (e) {
        console.warn('Open Library Title Search error:', e.message);
      }

      // 2B. Google Books API Title Search
      try {
        const gbSearchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanTitle)}&maxResults=1`;
        const gbSearchRes = await fetch(gbSearchUrl);
        if (gbSearchRes.ok) {
          const gbData = await gbSearchRes.json();
          if (gbData.items && gbData.items[0]?.volumeInfo?.imageLinks) {
            const images = gbData.items[0].volumeInfo.imageLinks;
            const cover = (images.extraLarge || images.large || images.medium || images.thumbnail || '')
              .replace('http://', 'https://');
            if (cover) {
              return res.json({
                success: true,
                found: true,
                source: 'Google Books (Title Match)',
                coverUrl: cover
              });
            }
          }
        }
      } catch (e) {
        console.warn('Google Books Title error:', e.message);
      }
    }

    // Step 3: No matching cover found -> Return standard placeholder
    res.json({
      success: true,
      found: false,
      source: 'Default Standard Placeholder',
      coverUrl: '/assets/covers/default-placeholder.svg',
      message: 'No online cover found. Standard placeholder cover assigned.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all books with filtering and search
// @route   GET /api/books
exports.getBooks = async (req, res, next) => {
  try {
    const { q, category, availableOnly, sort, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: regex },
        { author: regex },
        { isbn: regex },
        { description: regex }
      ];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (availableOnly === 'true') {
      filter.availableCopiesCount = { $gt: 0 };
    }

    let sortOption = { title: 1 };
    if (sort === 'author') sortOption = { author: 1 };
    if (sort === 'newest') sortOption = { publishedYear: -1 };
    if (sort === 'availability') sortOption = { availableCopiesCount: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Book.countDocuments(filter);
    const books = await Book.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    // Get list of distinct categories for filter dropdown
    const categories = await Book.distinct('category');

    res.json({
      success: true,
      count: books.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      categories,
      data: books
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search books
// @route   GET /api/books/search
exports.searchBooks = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const regex = new RegExp(q.trim(), 'i');
    const books = await Book.find({
      $or: [{ title: regex }, { author: regex }, { category: regex }]
    }).limit(10);

    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single book details
// @route   GET /api/books/:id
exports.getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
};

// @desc    Smart Multi-Library Book Finder with Haversine distance and delivery comparison
// @route   GET /api/books/:id/availability
exports.getBookAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userLat, userLng, sortBy = 'nearest' } = req.query;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Find all physical copies of this book
    const copies = await BookCopy.find({ book: id }).populate('library');

    // Group copies by library
    const libraryMap = {};
    for (const copy of copies) {
      if (!copy.library) continue;
      const libId = copy.library._id.toString();

      if (!libraryMap[libId]) {
        libraryMap[libId] = {
          library: copy.library,
          totalCopies: 0,
          availableCopies: 0,
          copies: []
        };
      }

      libraryMap[libId].totalCopies++;
      if (copy.status === 'available') {
        libraryMap[libId].availableCopies++;
      }
      libraryMap[libId].copies.push({
        barcode: copy.copyBarcode,
        status: copy.status,
        condition: copy.condition,
        rackLocation: copy.rackLocation
      });
    }

    // Also include any libraries that exist but currently have 0 copies of this book
    const allLibraries = await Library.find();
    for (const lib of allLibraries) {
      const libId = lib._id.toString();
      if (!libraryMap[libId]) {
        libraryMap[libId] = {
          library: lib,
          totalCopies: 0,
          availableCopies: 0,
          copies: []
        };
      }
    }

    const hasLiveCoords = Boolean(userLat && userLng && !isNaN(parseFloat(userLat)) && !isNaN(parseFloat(userLng)));

    const comparisonList = Object.values(libraryMap).map((item) => {
      const lib = item.library;
      let distanceKm;
      let isLiveDistance = false;

      if (hasLiveCoords && lib.coordinates && lib.coordinates.latitude) {
        distanceKm = calculateDistance(
          parseFloat(userLat),
          parseFloat(userLng),
          lib.coordinates.latitude,
          lib.coordinates.longitude
        );
        isLiveDistance = true;
      }

      if (distanceKm === null || distanceKm === undefined) {
        distanceKm = lib.sampleDistanceKm || 2.0;
        isLiveDistance = false;
      }

      const deliveryFee = calculateDeliveryCharge(
        distanceKm,
        lib.baseDeliveryFee || 20,
        lib.perKmFee || 5
      );

      const pickupAvailable = item.availableCopies > 0;
      const deliveryAvailable = lib.deliveryAvailable && item.availableCopies > 0;

      return {
        libraryId: lib._id,
        libraryName: lib.name,
        code: lib.code,
        address: lib.address,
        area: lib.area,
        city: lib.city,
        contactNumber: lib.contactNumber,
        operatingHours: lib.operatingHours,
        coordinates: lib.coordinates,
        distanceKm,
        isLiveDistance,
        distanceLabel: isLiveDistance
          ? `${distanceKm} km (Live GPS calculated)`
          : `${distanceKm} km (Estimated Mira-Bhayandar demonstration distance)`,
        pickup: {
          available: pickupAvailable,
          charge: 0,
          label: pickupAvailable ? 'Free Self-Pickup' : 'Currently Unavailable'
        },
        delivery: {
          available: deliveryAvailable,
          estimatedCharge: deliveryFee,
          label: deliveryAvailable ? `₹${deliveryFee} Estimated Delivery` : 'Delivery Unavailable'
        },
        totalCopies: item.totalCopies,
        availableCopies: item.availableCopies,
        stockStatus:
          item.availableCopies > 2
            ? 'In Stock'
            : item.availableCopies > 0
            ? 'Low Stock'
            : 'Out of Stock',
        copies: item.copies
      };
    });

    // Apply sorting
    if (sortBy === 'nearest') {
      comparisonList.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'lowest_delivery' || sortBy === 'cheapest_delivery') {
      comparisonList.sort((a, b) => a.delivery.estimatedCharge - b.delivery.estimatedCharge);
    } else if (sortBy === 'highest_availability' || sortBy === 'availability') {
      comparisonList.sort((a, b) => b.availableCopies - a.availableCopies);
    }

    res.json({
      success: true,
      book: {
        id: book._id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        category: book.category,
        coverImage: book.coverImage,
        totalCopiesCount: book.totalCopiesCount,
        availableCopiesCount: book.availableCopiesCount
      },
      userLocation: {
        provided: hasLiveCoords,
        lat: hasLiveCoords ? parseFloat(userLat) : null,
        lng: hasLiveCoords ? parseFloat(userLng) : null,
        note: hasLiveCoords
          ? 'Calculated with Haversine formula from supplied coordinates.'
          : 'Showing estimated sample distances from central Mira Road reference point.'
      },
      comparison: comparisonList
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new book (Admin only)
// @route   POST /api/books
exports.createBook = async (req, res, next) => {
  try {
    const { title, author, isbn, category, description, publishedYear, publisher, coverImage } = req.body;

    // 1. Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Book title is required.' });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ success: false, message: 'Author is required.' });
    }
    if (!isbn || !isbn.trim()) {
      return res.status(400).json({ success: false, message: 'ISBN is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const cleanIsbn = isbn.trim();
    const existingBook = await Book.findOne({ isbn: cleanIsbn });
    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: `Book with ISBN "${cleanIsbn}" already exists in the catalogue ("${existingBook.title}").`
      });
    }

    // 2. Cover image resolution: NEVER hardcode unrelated existing book covers!
    let finalCover = coverImage ? coverImage.trim() : '';

    // If remote URL, attempt to download and save locally in public/images/books/
    if (finalCover.startsWith('http://') || finalCover.startsWith('https://')) {
      const slug = `${slugify(title)}-${cleanIsbn.replace(/[^0-9X]/gi, '').slice(-6)}`;
      const savedLocal = await downloadAndSaveCover(finalCover, slug);
      if (savedLocal) {
        finalCover = savedLocal;
      }
    }

    // Standard neutral placeholder fallback if empty
    if (!finalCover) {
      finalCover = '/assets/covers/default-placeholder.svg';
    }

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: cleanIsbn,
      category: category.trim(),
      description: description ? description.trim() : `A ${category} book by ${author}.`,
      publishedYear: publishedYear ? parseInt(publishedYear) : new Date().getFullYear(),
      publisher: publisher ? publisher.trim() : 'Independent Publishing',
      coverImage: finalCover,
      totalCopiesCount: 0,
      availableCopiesCount: 0,
      isDemo: false
    });

    res.status(201).json({
      success: true,
      message: `Book "${book.title}" added to catalogue successfully!`,
      data: book
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update book (Admin only)
// @route   PUT /api/books/:id
exports.updateBook = async (req, res, next) => {
  try {
    const { title, author, isbn, category, description, publishedYear, publisher, coverImage } = req.body;

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (isbn && isbn.trim() !== book.isbn) {
      const existing = await Book.findOne({ isbn: isbn.trim(), _id: { $ne: book._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Another book already has ISBN ${isbn}` });
      }
      book.isbn = isbn.trim();
    }

    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (category) book.category = category.trim();
    if (description) book.description = description.trim();
    if (publishedYear) book.publishedYear = parseInt(publishedYear);
    if (publisher !== undefined) book.publisher = publisher.trim();

    if (coverImage) {
      let finalCover = coverImage.trim();
      if (finalCover.startsWith('http://') || finalCover.startsWith('https://')) {
        const slug = `${slugify(book.title)}-${book.isbn.replace(/[^0-9X]/gi, '').slice(-6)}`;
        const savedLocal = await downloadAndSaveCover(finalCover, slug);
        if (savedLocal) finalCover = savedLocal;
      }
      book.coverImage = finalCover;
    }

    await book.save();

    res.json({
      success: true,
      message: `Book "${book.title}" updated successfully!`,
      data: book
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete book (Admin only)
// @route   DELETE /api/books/:id
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Delete associated copies
    await BookCopy.deleteMany({ book: req.params.id });
    await book.deleteOne();

    res.json({ success: true, message: 'Book and associated copies deleted successfully' });
  } catch (err) {
    next(err);
  }
};
