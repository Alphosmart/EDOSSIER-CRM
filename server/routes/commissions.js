const express = require('express');
const router = express.Router();
const {
  getCommissions, getMyCommissions, approveCommission, disburseCommission, confirmReceipt, getCommissionSummary
} = require('../controllers/commissionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/summary', protect, getCommissionSummary);
router.get('/my', protect, getMyCommissions);
router.get('/', protect, getCommissions);
router.put('/:id/approve', protect, authorize('manager', 'admin'), approveCommission);
router.put('/:id/disburse', protect, authorize('admin'), disburseCommission);
router.put('/:id/confirm', protect, confirmReceipt);

module.exports = router;
