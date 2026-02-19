const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  phone: { type: String },
  whatsapp: { type: String },
  role: {
    type: String,
    enum: ['sales_rep', 'team_lead', 'manager', 'admin'],
    default: 'sales_rep'
  },
  territory: {
    type: String
    // Now stores any Nigerian state or country — no enum restriction
  },
  defaultCommissionRate: { type: Number, default: 25, min: 0, max: 100 },
  monthlyTarget: { type: Number, default: 0 },   // target deal value in USD per month
  isActive: { type: Boolean, default: true },
  // Password reset
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpiry: { type: Date, select: false },
  // JWT refresh token
  refreshToken: { type: String, select: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = Date.now();
  next();
});

// Compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken; // Return raw token (send via email)
};

// Return user without password
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpiry;
  delete user.refreshToken;
  return user;
};

// email has unique:true above — explicit UserSchema.index is not needed (would be duplicate)
UserSchema.index({ role: 1 });
UserSchema.index({ territory: 1 });

module.exports = mongoose.model('User', UserSchema);
