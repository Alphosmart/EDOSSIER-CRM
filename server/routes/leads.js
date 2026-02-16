const express = require('express');
const router = express.Router();
const {
  getLeads, getLeadById, createLead, updateLead, deleteLead,
  updateLeadStatus, getOverdueLeads, getTodayLeads
} = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');

// Special routes first (before :id param)
router.get('/overdue', protect, getOverdueLeads);
router.get('/today', protect, getTodayLeads);

router.get('/', protect, getLeads);
router.get('/:id', protect, getLeadById);
router.post('/', protect, createLead);
router.put('/:id', protect, updateLead);
router.delete('/:id', protect, authorize('manager', 'admin'), deleteLead);
router.put('/:id/status', protect, updateLeadStatus);

module.exports = router;
