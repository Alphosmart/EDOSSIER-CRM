const express = require('express');
const router = express.Router();
const { getKPIs, getPipeline, getRevenue, getMonthly, getTerritory, getForecast, getMonthlyPerformance, compareStats, getGeoBreakdown, getGeoOptions } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/kpis', protect, getKPIs);
router.get('/pipeline', protect, getPipeline);
router.get('/revenue', protect, getRevenue);
router.get('/monthly', protect, getMonthly);
router.get('/territory', protect, getTerritory);
router.get('/forecast', protect, getForecast);
router.get('/monthly-performance', protect, getMonthlyPerformance);
router.get('/compare', protect, compareStats);
router.get('/geo-breakdown', protect, getGeoBreakdown);
router.get('/geo-options', protect, getGeoOptions);

module.exports = router;
