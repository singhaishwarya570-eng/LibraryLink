const app = require('../server');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  // Ensure database is connected before handling the request
  await connectDB();
  return app(req, res);
};
