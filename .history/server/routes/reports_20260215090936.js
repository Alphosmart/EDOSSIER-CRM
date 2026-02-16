const express = require('express');
const router = express.Router();
const { getSalesReport, getCommissionReport, getTerritoryReport, exportData } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/sales', protect, getSalesReport);
router.get('/commissions', protect, getCommissionReport);
router.get('/territory', protect, getTerritoryReport);
router.get('/export', protect, exportData);

module.exports = router;
