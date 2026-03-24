const express = require('express');
const router = express.Router();
const {
  getLeads, getLeadById, createLead, updateLead, deleteLead,
  updateLeadStatus, getOverdueLeads, getTodayLeads,
  importLeads, addAttachment, deleteAttachment, reassignLead
} = require('../controllers/leadController');
const { remindLead, remindAllOverdue } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const { uploadCsv, uploadAttachment } = require('../middleware/upload');

// Special routes first (before :id param)
router.get('/overdue', protect, getOverdueLeads);
router.get('/today', protect, getTodayLeads);
router.post('/remind-overdue', protect, authorize('manager', 'admin'), remindAllOverdue);

// CSV import
router.post('/import', protect, authorize('manager', 'admin'), (req, res, next) => {
  uploadCsv(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, importLeads);

router.get('/', protect, getLeads);
router.get('/:id', protect, getLeadById);
router.post('/', protect, createLead);
router.put('/:id', protect, updateLead);
router.put('/:id/reassign', protect, reassignLead);
router.delete('/:id', protect, authorize('manager', 'admin'), deleteLead);
router.put('/:id/status', protect, updateLeadStatus);
router.post('/:id/remind', protect, authorize('manager', 'admin'), remindLead);

// File attachments
router.post('/:id/attachments', protect, (req, res, next) => {
  uploadAttachment(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, addAttachment);
router.delete('/:id/attachments/:attachmentId', protect, authorize('manager', 'admin'), deleteAttachment);

module.exports = router;
