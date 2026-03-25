const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Work', 'Study', 'Health', 'Personal'],
  },
  date: {
    type: String, // Storing as YYYY-MM-DD for easier filtering
    required: true,
  },
  deadline: {
    type: String, // Storing as HH:MM
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  expired: {
    type: Boolean,
    default: false
  },
  image: {
    type: String, // URL/path to stored image
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
