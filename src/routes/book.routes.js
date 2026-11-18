const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { protect, requireAdmin } = require('../middleware/auth');

router.get('/', bookController.getBooks);
router.get('/search', bookController.searchBooks);
router.get('/cover-lookup', bookController.lookupBookCover);
router.get('/:id', bookController.getBookById);
router.get('/:id/availability', bookController.getBookAvailability);

// Admin-only endpoints
router.post('/', protect, requireAdmin, bookController.createBook);
router.put('/:id', protect, requireAdmin, bookController.updateBook);
router.delete('/:id', protect, requireAdmin, bookController.deleteBook);

module.exports = router;
