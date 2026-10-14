const express = require('express');
const router = express.Router();
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  convertLead,
  deleteLead
} = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getLeads)
  .post(createLead);

router.route('/:id')
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

router.post('/:id/convert', convertLead);

module.exports = router;

