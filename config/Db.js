const mongoose = require('mongoose');
const dotenv = require('dotenv');
const createDefaultAdmin = require('./createDefaultAdmin');
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    createDefaultAdmin();
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

module.exports = connectDB;
