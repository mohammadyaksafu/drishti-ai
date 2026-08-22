const MLJob = require('../models/MLJob');
const Report = require('../models/Report');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * These endpoints exist so the pipeline can be inspected and driven from the API.
 * In the normal prototype flow the local Python worker talks to MongoDB directly,
 * so it never needs this server to be reachable.
 */

/** GET /api/jobs — queue overview */
exports.listJobs = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const filter = status && status !== 'ALL' ? { status } : {};
  const jobs = await MLJob.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('reportId', 'locationName primaryHazard severityLabel status')
    .lean();
  res.json({ success: true, data: { jobs } });
});

/** GET /api/jobs/next — claim the oldest pending job (atomic) */
exports.claimNextJob = asyncHandler(async (req, res) => {
  const job = await MLJob.findOneAndUpdate(
    { status: 'pending' },
    { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );

  if (!job) return res.json({ success: true, data: { job: null } });

  await Report.findByIdAndUpdate(job.reportId, { status: 'processing', lifecycle: 'PROCESSING' });
  res.json({ success: true, data: { job } });
});

/** POST /api/jobs/:id/complete — worker writes results back */
exports.completeJob = asyncHandler(async (req, res) => {
  const job = await MLJob.findById(req.params.id);
  if (!job) throw new ApiError(404, 'That job does not exist');

  const { detections = [], overallSeverity = 0, severityLabel = 'LOW', annotatedImageUrl, annotatedImagePublicId, modelVersion = '', processingTimeMs = 0 } = req.body;

  const report = await Report.findById(job.reportId);
  if (!report) throw new ApiError(404, 'The report for this job no longer exists');

  report.detections = detections;
  report.overallSeverity = overallSeverity;
  report.severityLabel = severityLabel;
  report.primaryHazard = detections.length
    ? detections.slice().sort((a, b) => b.severity - a.severity)[0].type
    : 'none';
  report.annotatedImageUrl = annotatedImageUrl || report.annotatedImageUrl;
  report.annotatedImagePublicId = annotatedImagePublicId || report.annotatedImagePublicId;
  report.modelVersion = modelVersion;
  report.processingTimeMs = processingTimeMs;
  report.status = 'completed';
  report.processedAt = new Date();
  report.priority = overallSeverity;
  report.syncLifecycle();
  await report.save();

  job.status = 'completed';
  job.completedAt = new Date();
  job.error = '';
  await job.save();

  res.json({ success: true, data: { job, report } });
});

/** POST /api/jobs/:id/fail */
exports.failJob = asyncHandler(async (req, res) => {
  const job = await MLJob.findById(req.params.id);
  if (!job) throw new ApiError(404, 'That job does not exist');

  job.status = 'failed';
  job.error = String(req.body.error || 'Inference failed').slice(0, 500);
  job.completedAt = new Date();
  await job.save();

  await Report.findByIdAndUpdate(job.reportId, { status: 'failed', failureReason: job.error });

  res.json({ success: true, data: { job } });
});
