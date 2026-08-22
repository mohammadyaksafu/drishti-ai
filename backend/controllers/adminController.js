const User = require('../models/User');
const Report = require('../models/Report');
const MLJob = require('../models/MLJob');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { destroyImage } = require('../config/cloudinary');

/** GET /api/admin/users */
exports.listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const filter = {};
  if (req.query.role && req.query.role !== 'ALL') filter.role = req.query.role;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { district: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // Attach each user's report count so the panel is useful at a glance.
  const counts = await Report.aggregate([
    { $match: { reportedBy: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$reportedBy', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  res.json({
    success: true,
    data: {
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        district: u.district,
        organization: u.organization,
        isActive: u.isActive,
        reportCount: countMap[String(u._id)] || 0,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

/** PUT /api/admin/users/:id — change role or deactivate */
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'That user does not exist');
  if (String(user._id) === String(req.user._id) && req.body.role && req.body.role !== 'admin') {
    throw new ApiError(400, 'You cannot remove your own admin role');
  }

  const { role, isActive, organization, district } = req.body;
  if (role && ['citizen', 'authority', 'admin'].includes(role)) user.role = role;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (organization !== undefined) user.organization = organization;
  if (district !== undefined) user.district = district;
  await user.save();

  res.json({ success: true, data: { user: user.toPublic() } });
});

/** DELETE /api/admin/users/:id */
exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account here');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'That user does not exist');
  await Report.updateMany({ reportedBy: user._id }, { reportedBy: null, reporterName: 'Removed account' });
  res.json({ success: true, data: { id: req.params.id, message: 'Account deleted' } });
});

/** POST /api/admin/reports/:id/resolve */
exports.setResolution = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'That report does not exist');

  const next = req.body.resolutionStatus === 'resolved' ? 'resolved' : 'unresolved';
  report.resolutionStatus = next;
  report.resolvedAt = next === 'resolved' ? new Date() : null;
  report.resolvedBy = next === 'resolved' ? req.user._id : null;
  if (req.body.authorityNote !== undefined) report.authorityNote = String(req.body.authorityNote).slice(0, 600);
  report.syncLifecycle();
  await report.save();

  res.json({ success: true, data: { report } });
});

/** DELETE /api/admin/reports/:id */
exports.deleteReportAsAdmin = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'That report does not exist');
  await Promise.all([
    destroyImage(report.imagePublicId),
    destroyImage(report.annotatedImagePublicId),
    MLJob.deleteMany({ reportId: report._id }),
  ]);
  await report.deleteOne();
  res.json({ success: true, data: { id: req.params.id, message: 'Report deleted' } });
});
