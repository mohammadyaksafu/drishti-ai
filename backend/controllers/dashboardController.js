const Report = require('../models/Report');
const MLJob = require('../models/MLJob');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { HAZARD_TYPES, BANGLADESH_BOUNDS } = require('../utils/constants');

/** GET /api/dashboard/statistics */
exports.getStatistics = asyncHandler(async (req, res) => {
  const [
    total,
    critical,
    high,
    moderate,
    low,
    resolved,
    pendingAI,
    processing,
    failed,
    completed,
    contributors,
  ] = await Promise.all([
    Report.countDocuments({}),
    Report.countDocuments({ severityLabel: 'CRITICAL', status: 'completed' }),
    Report.countDocuments({ severityLabel: 'HIGH', status: 'completed' }),
    Report.countDocuments({ severityLabel: 'MODERATE', status: 'completed' }),
    Report.countDocuments({ severityLabel: 'LOW', status: 'completed' }),
    Report.countDocuments({ resolutionStatus: 'resolved' }),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'processing' }),
    Report.countDocuments({ status: 'failed' }),
    Report.countDocuments({ status: 'completed' }),
    User.countDocuments({}),
  ]);

  const severityAvg = await Report.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, avg: { $avg: '$overallSeverity' } } },
  ]);

  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

  res.json({
    success: true,
    data: {
      totals: {
        total,
        completed,
        resolved,
        unresolved: total - resolved,
        pendingAI,
        processing,
        failed,
        contributors,
      },
      severity: { critical, high, moderate, low, average: Math.round(severityAvg[0]?.avg || 0) },
      resolutionRate,
    },
  });
});

/** GET /api/dashboard/hazards — chart-ready aggregates */
exports.getHazardBreakdown = asyncHandler(async (req, res) => {
  const days = Math.min(180, Math.max(7, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byType, bySeverity, overTime, byDistrict, topCritical] = await Promise.all([
    Report.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$primaryHazard', count: { $sum: 1 }, avgSeverity: { $avg: '$overallSeverity' } } },
      { $sort: { count: -1 } },
    ]),
    Report.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$severityLabel', count: { $sum: 1 } } },
    ]),
    Report.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          reports: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severityLabel', 'CRITICAL'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$resolutionStatus', 'resolved'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Report.aggregate([
      { $match: { district: { $nin: ['', null] } } },
      { $group: { _id: '$district', count: { $sum: 1 }, avgSeverity: { $avg: '$overallSeverity' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Report.find({ status: 'completed', resolutionStatus: 'unresolved' })
      .sort({ overallSeverity: -1, createdAt: -1 })
      .limit(5)
      .select('primaryHazard overallSeverity severityLabel locationName district createdAt latitude longitude')
      .lean(),
  ]);

  // Fill hazard types that have no reports yet so charts keep a stable shape.
  const typeMap = Object.fromEntries(byType.map((t) => [t._id, t]));
  const hazardDistribution = HAZARD_TYPES.map((type) => ({
    type,
    count: typeMap[type]?.count || 0,
    avgSeverity: Math.round(typeMap[type]?.avgSeverity || 0),
  }));

  const severityMap = Object.fromEntries(bySeverity.map((s) => [s._id, s.count]));

  res.json({
    success: true,
    data: {
      hazardDistribution,
      severityDistribution: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((label) => ({
        label,
        count: severityMap[label] || 0,
      })),
      reportsOverTime: overTime.map((d) => ({
        date: d._id,
        reports: d.reports,
        critical: d.critical,
        resolved: d.resolved,
      })),
      districts: byDistrict.map((d) => ({
        district: d._id,
        count: d.count,
        avgSeverity: Math.round(d.avgSeverity || 0),
      })),
      topCritical,
    },
  });
});

/**
 * GET /api/dashboard/map
 * Public map feed. Only points inside Bangladesh are ever returned.
 */
exports.getMapData = asyncHandler(async (req, res) => {
  const filter = {
    status: 'completed',
    latitude: { $gte: BANGLADESH_BOUNDS.minLat, $lte: BANGLADESH_BOUNDS.maxLat },
    longitude: { $gte: BANGLADESH_BOUNDS.minLng, $lte: BANGLADESH_BOUNDS.maxLng },
  };

  if (req.query.severity && req.query.severity !== 'ALL') {
    filter.severityLabel = String(req.query.severity).toUpperCase();
  }
  if (req.query.hazard && req.query.hazard !== 'ALL' && HAZARD_TYPES.includes(req.query.hazard)) {
    filter.primaryHazard = req.query.hazard;
  }
  if (req.query.resolution && req.query.resolution !== 'ALL') {
    filter.resolutionStatus = req.query.resolution;
  }

  const markers = await Report.find(filter)
    .select(
      'latitude longitude primaryHazard severityLabel overallSeverity detections locationName district resolutionStatus annotatedImageUrl imageUrl createdAt'
    )
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  res.json({
    success: true,
    data: {
      bounds: BANGLADESH_BOUNDS,
      count: markers.length,
      markers: markers.map((m) => ({
        id: m._id,
        latitude: m.latitude,
        longitude: m.longitude,
        hazard: m.primaryHazard,
        severityLabel: m.severityLabel,
        severityScore: m.overallSeverity,
        confidence: m.detections?.[0]?.confidence ?? null,
        locationName: m.locationName,
        district: m.district,
        resolutionStatus: m.resolutionStatus,
        thumbnail: m.annotatedImageUrl || m.imageUrl,
        createdAt: m.createdAt,
      })),
    },
  });
});

/** GET /api/dashboard/pipeline — worker health for the admin panel */
exports.getPipeline = asyncHandler(async (req, res) => {
  const [jobs, recent] = await Promise.all([
    MLJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    MLJob.find({}).sort({ updatedAt: -1 }).limit(10).populate('reportId', 'locationName primaryHazard').lean(),
  ]);

  const counts = Object.fromEntries(jobs.map((j) => [j._id, j.count]));
  const lastCompleted = await MLJob.findOne({ status: 'completed' }).sort({ completedAt: -1 }).lean();

  const workerOnline =
    lastCompleted?.completedAt &&
    Date.now() - new Date(lastCompleted.completedAt).getTime() < 10 * 60 * 1000;

  res.json({
    success: true,
    data: {
      jobs: {
        pending: counts.pending || 0,
        processing: counts.processing || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      },
      workerOnline: Boolean(workerOnline),
      lastCompletedAt: lastCompleted?.completedAt || null,
      recent,
    },
  });
});
