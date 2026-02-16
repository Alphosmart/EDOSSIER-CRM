const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser, getUserPerformance } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), getUsers);
router.get('/:id', protect, authorize('admin', 'manager'), getUserById);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.get('/:id/performance', protect, getUserPerformance);

module.exports = router;
