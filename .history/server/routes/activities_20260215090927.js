const express = require('express');
const router = express.Router();
const { getActivities, createActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.get('/:leadId', protect, getActivities);
router.post('/', protect, createActivity);

module.exports = router;
