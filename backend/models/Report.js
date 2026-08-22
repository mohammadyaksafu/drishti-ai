const mongoose = require('mongoose');
const { HAZARD_TYPES, REPORT_STATUS, LIFECYCLE, SEVERITY_LABELS } = require('../utils/constants');

const boundingBoxSchema = new mongoose.Schema(
  {
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
  },
  { _id: false }
);

const detectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: HAZARD_TYPES, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    severity: { type: Number, min: 0, max: 100, required: true },
    severityLabel: { type: String, enum: SEVERITY_LABELS },
    areaRatio: { type: Number, min: 0, max: 1, default: 0 },
    boundingBox: { type: boundingBoxSchema, required: true },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    // Media
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    annotatedImageUrl: { type: String, default: null },
    annotatedImagePublicId: { type: String, default: null },

    // Geo (Bangladesh only — validated in the controller)
    latitude: { type: Number, required: true, min: 20.5, max: 26.7 },
    longitude: { type: Number, required: true, min: 88.0, max: 92.7 },
    locationName: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },

    description: { type: String, trim: true, maxlength: 600, default: '' },

    // AI pipeline
    status: { type: String, enum: REPORT_STATUS, default: 'pending', index: true },
    detections: { type: [detectionSchema], default: [] },
    overallSeverity: { type: Number, min: 0, max: 100, default: 0 },
    severityLabel: { type: String, enum: SEVERITY_LABELS, default: 'LOW', index: true },
    primaryHazard: { type: String, enum: [...HAZARD_TYPES, 'none'], default: 'none', index: true },
    modelVersion: { type: String, default: '' },
    processingTimeMs: { type: Number, default: 0 },
    failureReason: { type: String, default: '' },

    // Authority workflow
    lifecycle: { type: String, enum: LIFECYCLE, default: 'SUBMITTED', index: true },
    resolutionStatus: { type: String, enum: ['unresolved', 'resolved'], default: 'unresolved', index: true },
    priority: { type: Number, min: 0, max: 100, default: 0 },
    authorityNote: { type: String, trim: true, maxlength: 600, default: '' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    reporterName: { type: String, default: 'Anonymous citizen' },

    processedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reportSchema.index({ createdAt: -1 });
reportSchema.index({ latitude: 1, longitude: 1 });

// Keeps the lifecycle string in step with the AI + resolution state.
reportSchema.methods.syncLifecycle = function syncLifecycle() {
  if (this.resolutionStatus === 'resolved') this.lifecycle = 'RESOLVED';
  else if (this.status === 'completed')
    this.lifecycle = this.severityLabel === 'CRITICAL' || this.severityLabel === 'HIGH'
      ? 'PRIORITIZED'
      : 'AI_COMPLETED';
  else if (this.status === 'processing') this.lifecycle = 'PROCESSING';
  else if (this.status === 'pending') this.lifecycle = 'PENDING_AI';
  return this.lifecycle;
};

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);
