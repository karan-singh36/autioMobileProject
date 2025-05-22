const mongoose = require('mongoose');

const mongoURL = "mongodb+srv://krao09672:yadavAutomobiles168451321215645512554621545456@cluster0.vy8mxjj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURL);
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

module.exports = connectDB;
