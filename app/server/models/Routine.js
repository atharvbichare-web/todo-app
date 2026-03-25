const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Work', 'Study', 'Health', 'Personal'],
  }
}, { timestamps: true });

module.exports = mongoose.model('Routine', routineSchema);
