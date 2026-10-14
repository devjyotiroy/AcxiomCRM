const express = require('express');
const router = express.Router();
const {
  getFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  rescheduleFollowUp,
  deleteFollowUp
} = require('../controllers/followUpController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getFollowUps)
  .post(createFollowUp);

router.route('/:id')
  .get(getFollowUpById)
  .put(updateFollowUp)
  .delete(deleteFollowUp);

router.patch('/:id/complete', completeFollowUp);
router.patch('/:id/reschedule', rescheduleFollowUp);

module.exports = router;

