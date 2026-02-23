const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getUserPerformance, 
  setCommissionRate,
  getAvailablePermissions,
  getUserPermissions,
  updateUserPermissions
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), getUsers);
router.get('/permissions/available', protect, authorize('admin'), getAvailablePermissions);
router.get('/:id', protect, authorize('admin', 'manager'), getUserById);
router.get('/:id/permissions', protect, authorize('admin'), getUserPermissions);
router.put('/:id', protect, authorize('admin'), updateUser);
router.put('/:id/permissions', protect, authorize('admin'), updateUserPermissions);
router.patch('/:id/commission-rate', protect, authorize('admin'), setCommissionRate);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.get('/:id/performance', protect, getUserPerformance);

module.exports = router;
