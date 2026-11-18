const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect, requireAdmin } = require('../middleware/auth');

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.post('/:id/register', eventController.registerForEvent);

// Admin-only endpoints
router.get('/:id/registrations', protect, requireAdmin, eventController.getEventRegistrations);
router.post('/', protect, requireAdmin, eventController.createEvent);
router.put('/:id', protect, requireAdmin, eventController.updateEvent);
router.delete('/:id', protect, requireAdmin, eventController.deleteEvent);

module.exports = router;
