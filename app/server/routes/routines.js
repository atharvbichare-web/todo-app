const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');

// Get all routines
router.get('/', async (req, res) => {
  try {
    const routines = await Routine.find();
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add routine
router.post('/', async (req, res) => {
  const { title, category } = req.body;
  try {
    const newRoutine = new Routine({ title, category });
    const savedRoutine = await newRoutine.save();
    res.status(201).json(savedRoutine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
