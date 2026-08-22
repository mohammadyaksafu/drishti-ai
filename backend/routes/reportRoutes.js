const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/reportController');
const { upload } = require('../middleware/upload');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Uploads are the expensive path, so they get their own tighter limit.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many reports submitted. Try again in a few minutes.' },
});

router
  .route('/')
  .post(protect, submitLimiter, upload.single('image'), ctrl.createReport)
  .get(optionalAuth, ctrl.getReports);

router.get('/:id/status', ctrl.getReportStatus);
router.post('/:id/retry', protect, ctrl.retryReport);

router
  .route('/:id')
  .get(ctrl.getReportById)
  .put(protect, ctrl.updateReport)
  .delete(protect, ctrl.deleteReport);

module.exports = router;
