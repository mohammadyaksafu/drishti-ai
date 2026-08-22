const mongoose = require('mongoose');
const Report = require('../models/Report');
const MLJob = require('../models/MLJob');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { uploadBuffer, destroyImage, isCloudinaryConfigured } = require('../config/cloudinary');
const { isInsideBangladesh, HAZARD_TYPES } = require('../utils/constants');

const PUBLIC_FIELDS =
  'imageUrl annotatedImageUrl latitude longitude locationName district description status ' +
  'detections overallSeverity severityLabel primaryHazard lifecycle resolutionStatus priority ' +
  'authorityNote processingTimeMs failureReason reporterName reportedBy createdAt processedAt updatedAt';

/**
 * POST /api/reports
 * Uploads the image to Cloudinary, stores the report, and queues an ML job.
 * The heavy inference is deliberately *not* done here — see ml-backend/services/worker.py.
 */
exports.createReport = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Attach a road image to submit a report');
  if (!isCloudinaryConfigured()) {
    throw new ApiError(500, 'Image storage is not configured on the server');
  }

  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'A valid latitude and longitude are required');
  }
  if (!isInsideBangladesh(latitude, longitude)) {
    throw new ApiError(
      422,
      'DRISHTI AI currently covers Bangladesh only. Pick a location inside the country.'
    );
  }

  const uploaded = await uploadBuffer(req.file.buffer, 'drishti-ai/originals');

  const report = await Report.create({
    imageUrl: uploaded.secure_url,
    imagePublicId: uploaded.public_id,
    latitude,
    longitude,
    locationName: (req.body.locationName || '').trim(),
    district: (req.body.district || '').trim(),
    description: (req.body.description || '').trim(),
    status: 'pending',
    lifecycle: 'PENDING_AI',
    reportedBy: req.user ? req.user._id : null,
    reporterName: req.user ? req.user.name : 'Anonymous citizen',
  });

  const job = await MLJob.create({
    reportId: report._id,
    imageUrl: report.imageUrl,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: { report, jobId: job._id, message: 'Report queued for AI analysis' },
  });
});

/** GET /api/reports — public list with filters + pagination */
exports.getReports = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const filter = {};
  if (req.query.severity && req.query.severity !== 'ALL') {
    filter.severityLabel = String(req.query.severity).toUpperCase();
  }
  if (req.query.hazard && req.query.hazard !== 'ALL' && HAZARD_TYPES.includes(req.query.hazard)) {
    filter.primaryHazard = req.query.hazard;
  }
  if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;
  if (req.query.resolution && req.query.resolution !== 'ALL') {
    filter.resolutionStatus = req.query.resolution;
  }
  if (req.query.mine === 'true' && req.user) filter.reportedBy = req.user._id;
  if (req.query.district) filter.district = new RegExp(String(req.query.district).trim(), 'i');
  if (req.query.search) {
    filter.$or = [
      { locationName: new RegExp(String(req.query.search).trim(), 'i') },
      { description: new RegExp(String(req.query.search).trim(), 'i') },
    ];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    severity: { overallSeverity: -1, createdAt: -1 },
  };
  const sort = sortMap[req.query.sort] || sortMap.newest;

  const [items, total] = await Promise.all([
    Report.find(filter).select(PUBLIC_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Report.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      reports: items,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

/** GET /api/reports/:id */
exports.getReportById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'That report id is not valid');

  const report = await Report.findById(req.params.id).select(PUBLIC_FIELDS).lean();
  if (!report) throw new ApiError(404, 'That report does not exist');

  res.json({ success: true, data: { report } });
});

/** GET /api/reports/:id/status — small payload used by the polling hook */
exports.getReportStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'That report id is not valid');

  const report = await Report.findById(req.params.id)
    .select('status severityLabel overallSeverity processedAt failureReason')
    .lean();
  if (!report) throw new ApiError(404, 'That report does not exist');

  const job = await MLJob.findOne({ reportId: report._id })
    .select('status attempts error startedAt completedAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      status: report.status,
      severityLabel: report.severityLabel,
      overallSeverity: report.overallSeverity,
      processedAt: report.processedAt,
      failureReason: report.failureReason,
      job: job || null,
    },
  });
});

/**
 * PUT /api/reports/:id
 * Citizens may edit their own description/location text.
 * Authorities and admins may also move the workflow forward.
 */
exports.updateReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'That report does not exist');

  const isOwner = req.user && report.reportedBy && String(report.reportedBy) === String(req.user._id);
  const isStaff = req.user && ['authority', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) throw new ApiError(403, 'You can only edit reports you submitted');

  const { description, locationName, district } = req.body;
  if (description !== undefined) report.description = String(description).slice(0, 600);
  if (locationName !== undefined) report.locationName = String(locationName).slice(0, 160);
  if (district !== undefined) report.district = String(district).slice(0, 80);

  if (isStaff) {
    const { resolutionStatus, authorityNote, priority, lifecycle } = req.body;
    if (resolutionStatus && ['resolved', 'unresolved'].includes(resolutionStatus)) {
      report.resolutionStatus = resolutionStatus;
      report.resolvedAt = resolutionStatus === 'resolved' ? new Date() : null;
      report.resolvedBy = resolutionStatus === 'resolved' ? req.user._id : null;
    }
    if (authorityNote !== undefined) report.authorityNote = String(authorityNote).slice(0, 600);
    if (priority !== undefined && Number.isFinite(Number(priority))) {
      report.priority = Math.min(100, Math.max(0, Number(priority)));
    }
    if (lifecycle) report.lifecycle = lifecycle;
    else report.syncLifecycle();
  }

  await report.save();
  res.json({ success: true, data: { report } });
});

/** DELETE /api/reports/:id — owner or admin */
exports.deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'That report does not exist');

  const isOwner = req.user && report.reportedBy && String(report.reportedBy) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete reports you submitted');
  }

  await Promise.all([
    destroyImage(report.imagePublicId),
    destroyImage(report.annotatedImagePublicId),
    MLJob.deleteMany({ reportId: report._id }),
  ]);
  await report.deleteOne();

  res.json({ success: true, data: { id: req.params.id, message: 'Report deleted' } });
});

/** POST /api/reports/:id/retry — requeue a failed analysis */
exports.retryReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'That report does not exist');
  if (report.status === 'processing') throw new ApiError(409, 'This report is already being analysed');

  report.status = 'pending';
  report.lifecycle = 'PENDING_AI';
  report.failureReason = '';
  await report.save();

  await MLJob.findOneAndUpdate(
    { reportId: report._id },
    {
      status: 'pending',
      error: '',
      startedAt: null,
      completedAt: null,
      imageUrl: report.imageUrl,
      $inc: { attempts: 0 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, data: { report, message: 'Analysis queued again' } });
});
