require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', require('./src/routes/health.routes'));
app.use('/api/books', require('./src/routes/book.routes'));
app.use('/api/libraries', require('./src/routes/library.routes'));
app.use('/api/reservations', require('./src/routes/reservation.routes'));
app.use('/api/events', require('./src/routes/event.routes'));
app.use('/api/reading-progress', require('./src/routes/readingProgress.routes'));
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));

// 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use(errorHandler);

// Start Server helper
const startServer = async () => {
  try {
    await connectDB();
    const serverInstance = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` LibraryLink Server is running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(` Web Frontend: http://localhost:${PORT}/`);
      console.log(`===============================================`);
    });
    return serverInstance;
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

