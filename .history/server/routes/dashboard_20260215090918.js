const express = require('express');
const router = express.Router();
const { getKPIs, getPipeline, getRevenue, getMonthly, getTerritory } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/kpis', protect, getKPIs);
router.get('/pipeline', protect, getPipeline);
router.get('/revenue', protect, getRevenue);
router.get('/monthly', protect, getMonthly);
router.get('/territory', protect, getTerritory);

module.exports = router;
