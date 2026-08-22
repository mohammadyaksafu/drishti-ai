const { validationResult } = require('express-validator');
const User = require('../models/User');
const Report = require('../models/Report');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { signToken } = require('../middleware/auth');

function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, errors.array()[0].msg);
}

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  assertValid(req);
  const { name, email, password, phone = '', district = '' } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'That email is already registered. Sign in instead.');

  // The first account matching ADMIN_EMAIL is bootstrapped as an admin.
  const role =
    process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
      ? 'admin'
      : 'citizen';

  const user = await User.create({ name, email, password, phone, district, role });
  const token = signToken(user);

  res.status(201).json({ success: true, data: { token, user: user.toPublic() } });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  assertValid(req);
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Email or password is incorrect');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, data: { token: signToken(user), user: user.toPublic() } });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const [total, resolved] = await Promise.all([
    Report.countDocuments({ reportedBy: req.user._id }),
    Report.countDocuments({ reportedBy: req.user._id, resolutionStatus: 'resolved' }),
  ]);
  res.json({ success: true, data: { user: req.user.toPublic(), stats: { total, resolved } } });
});

// PUT /api/auth/me
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, district, organization } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (district !== undefined) user.district = district;
  if (organization !== undefined) user.organization = organization;
  await user.save();
  res.json({ success: true, data: { user: user.toPublic() } });
});

// PUT /api/auth/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'The new password needs at least 8 characters');
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword || ''))) {
    throw new ApiError(401, 'Your current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, data: { message: 'Password updated' } });
});
