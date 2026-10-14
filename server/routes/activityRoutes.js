const express = require('express');
const router = express.Router();
const {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity
} = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getActivities)
  .post(createActivity);

router.route('/:id')
  .get(getActivityById)
  .put(updateActivity)
  .delete(deleteActivity);

module.exports = router;

