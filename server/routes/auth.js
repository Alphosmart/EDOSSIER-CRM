const express = require('express');
const router = express.Router();
const {
  register, login, getMe, changePassword, logout,
  refreshToken, forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', protect, authorize('admin'), register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
