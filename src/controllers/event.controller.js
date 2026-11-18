const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const { calculateDistance } = require('../utils/haversine');

// @desc    Get all events with optional filters (eventType, search)
// @route   GET /api/events
exports.getEvents = async (req, res, next) => {
  try {
    const { type, q, userLat, userLng } = req.query;
    const filter = {};

    if (type && type !== 'All') {
      filter.eventType = type;
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { venue: regex }];
    }

    const events = await Event.find(filter).populate('library').sort({ date: 1 });

    const hasLiveCoords = Boolean(userLat && userLng && !isNaN(parseFloat(userLat)) && !isNaN(parseFloat(userLng)));

    const enrichedEvents = events.map((evt) => {
      let distanceKm = evt.sampleDistanceKm || 2.0;
      let isLiveDistance = false;

      if (hasLiveCoords && evt.coordinates && evt.coordinates.latitude) {
        distanceKm = calculateDistance(
          parseFloat(userLat),
          parseFloat(userLng),
          evt.coordinates.latitude,
          evt.coordinates.longitude
        );
        isLiveDistance = true;
      }

      return {
        ...evt.toObject(),
        distanceKm,
        isLiveDistance,
        distanceLabel: isLiveDistance
          ? `${distanceKm} km (Live GPS calculated)`
          : `${distanceKm} km (Estimated Mira-Bhayandar distance)`
      };
    });

    res.json({
      success: true,
      count: enrichedEvents.length,
      data: enrichedEvents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('library');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

// @desc    Register for an event
// @route   POST /api/events/:id/register
exports.registerForEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userName, userEmail, userPhone } = req.body;

    if (!userName || !userEmail || !userPhone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone number are required to register for an event.'
      });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check seat availability
    if (event.availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Registration is full for this event. No seats currently available.'
      });
    }

    // Check duplicate registration
    const existingRegistration = await EventRegistration.findOne({
      event: id,
      userEmail: userEmail.toLowerCase().trim()
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: `You are already registered for this event with email ${userEmail} (${existingRegistration.registrationNumber}).`
      });
    }

    // Generate registration number
    const regSeq = Math.floor(1000 + Math.random() * 9000);
    const registrationNumber = `EVT-REG-${regSeq}`;

    // Create registration
    const registration = await EventRegistration.create({
      registrationNumber,
      event: event._id,
      eventTitle: event.title,
      userName: userName.trim(),
      userEmail: userEmail.toLowerCase().trim(),
      userPhone: userPhone.trim(),
      status: 'Confirmed',
      isDemo: true
    });

    // Decrement available seats
    event.availableSeats = Math.max(0, event.availableSeats - 1);
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Registration confirmed successfully!',
      data: {
        registrationNumber: registration.registrationNumber,
        eventTitle: event.title,
        venue: event.venue,
        date: event.date,
        time: event.time,
        registeredName: registration.userName,
        remainingSeats: event.availableSeats
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get registrations for an event (Admin)
// @route   GET /api/events/:id/registrations
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const registrations = await EventRegistration.find({ event: req.params.id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new event (Admin)
// @route   POST /api/events
exports.createEvent = async (req, res, next) => {
  try {
    const { title, eventType, description, date, time, library, venue, area, totalSeats, speakerOrHost } = req.body;

    const event = await Event.create({
      title,
      eventType,
      description,
      date: new Date(date),
      time,
      library: library || null,
      venue,
      area: area || 'Mira Road',
      totalSeats: totalSeats || 30,
      availableSeats: totalSeats || 30,
      speakerOrHost,
      isDemo: true
    });

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

// @desc    Update event (Admin)
// @route   PUT /api/events/:id
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete event (Admin)
// @route   DELETE /api/events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    await EventRegistration.deleteMany({ event: req.params.id });
    await event.deleteOne();
    res.json({ success: true, message: 'Event and registrations removed successfully' });
  } catch (err) {
    next(err);
  }
};
