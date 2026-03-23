const express = require('express');
const router = express.Router();
const { getAllRates, upsertRate, deleteRate, refreshRates } = require('../controllers/exchangeRateController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',                  protect,                               getAllRates);
router.post('/refresh',          protect, authorize('admin', 'manager', 'bursar'), refreshRates);
router.put('/:currency',         protect, authorize('admin', 'manager', 'bursar'), upsertRate);
router.delete('/:currency',      protect, authorize('admin'),            deleteRate);

module.exports = router;
