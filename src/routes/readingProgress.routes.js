const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingProgress.controller');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/community-stats', readingController.getCommunityStats);
router.get('/me', protect, readingController.getMyProgress);
router.get('/', optionalAuth, readingController.getProgress);
router.post('/', optionalAuth, readingController.createProgress);
router.put('/update', optionalAuth, readingController.updateProgress);

module.exports = router;
