const mongoose = require('mongoose');

const mlJobSchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    imageUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    error: { type: String, default: '' },
    workerId: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The worker claims the oldest pending job first.
mlJobSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.models.MLJob || mongoose.model('MLJob', mlJobSchema);
