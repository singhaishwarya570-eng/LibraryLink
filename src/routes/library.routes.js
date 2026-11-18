const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/library.controller');
const { protect, requireAdmin } = require('../middleware/auth');

router.get('/', libraryController.getLibraries);
router.get('/:id', libraryController.getLibraryById);

// Admin-only endpoints
router.post('/', protect, requireAdmin, libraryController.createLibrary);
router.put('/:id', protect, requireAdmin, libraryController.updateLibrary);
router.delete('/:id', protect, requireAdmin, libraryController.deleteLibrary);

module.exports = router;
