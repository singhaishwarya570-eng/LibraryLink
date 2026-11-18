const mongoose = require('mongoose');

let cachedPromise = null;

const connectDB = async () => {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection is in-flight, return the existing promise
  if (!cachedPromise) {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/librarylink';
    cachedPromise = mongoose.connect(connUri).then((conn) => {
      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
      return conn;
    }).catch((error) => {
      cachedPromise = null;
      console.error(`[MongoDB] Connection error: ${error.message}`);
      throw error;
    });
  }

  return cachedPromise;
};

module.exports = connectDB;
