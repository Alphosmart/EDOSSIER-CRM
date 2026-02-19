const express = require('express');
const router = express.Router();
const { getSubscriptionSummary } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, getSubscriptionSummary);

module.exports = router;
