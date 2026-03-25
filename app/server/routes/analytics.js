const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Helper to get start and end dates based on year and optional month
const getDateRange = (year, month = null) => {
  let startDate, endDate;
  if (month !== null) {
    // month is 1-indexed in UI, 0-indexed in JS dates usually, but we are querying strings 'YYYY-MM-DD'
    // Let's use regex to match the YYYY-MM prefix
    const paddedMonth = month.toString().padStart(2, '0');
    return new RegExp(`^${year}-${paddedMonth}`);
  } else {
    return new RegExp(`^${year}`);
  }
};

router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const { year, month } = req.query; // year is required e.g., 2026. month is 1-12

  if (!year) return res.status(400).json({ message: 'Year is required' });

  try {
    let dateRegex;
    if (type === 'month') {
      if (!month) return res.status(400).json({ message: 'Month is required for monthly analytics' });
      dateRegex = getDateRange(year, month);
    } else if (type === 'year') {
      dateRegex = getDateRange(year);
    } else {
      return res.status(400).json({ message: 'Invalid analytics type. Use month or year' });
    }

    const matchQuery = { date: { $regex: dateRegex } };

    const result = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          expiredTasks: {
            $sum: { $cond: [{ $eq: ["$expired", true] }, 1, 0] }
          }
        }
      }
    ]);

    if (result.length === 0) {
      return res.json({ totalTasks: 0, completedTasks: 0, expiredTasks: 0, completionPercentage: 0, expiredPercentage: 0 });
    }

    const { totalTasks, completedTasks, expiredTasks } = result[0];
    const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const expiredPercentage = totalTasks === 0 ? 0 : Math.round((expiredTasks / totalTasks) * 100);

    res.json({
      totalTasks,
      completedTasks,
      expiredTasks,
      completionPercentage,
      expiredPercentage
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
