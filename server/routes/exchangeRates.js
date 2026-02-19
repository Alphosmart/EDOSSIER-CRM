const express = require('express');
const router = express.Router();
const { getAllRates, upsertRate, deleteRate } = require('../controllers/exchangeRateController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',                  protect,                          getAllRates);
router.put('/:currency',         protect, authorize('admin', 'manager'), upsertRate);
router.delete('/:currency',      protect, authorize('admin'),           deleteRate);

module.exports = router;
