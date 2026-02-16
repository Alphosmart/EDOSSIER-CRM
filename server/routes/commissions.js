const express = require('express');
const router = express.Router();
const {
  getCommissions, getMyCommissions, approveCommission, payCommission, getCommissionSummary
} = require('../controllers/commissionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/summary', protect, getCommissionSummary);
router.get('/my', protect, getMyCommissions);
router.get('/', protect, getCommissions);
router.put('/:id/approve', protect, authorize('manager', 'admin'), approveCommission);
router.put('/:id/pay', protect, authorize('admin'), payCommission);

module.exports = router;
