const express = require('express');
const ctrl = require('../controllers/jobController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, restrictTo('authority', 'admin'), ctrl.listJobs);
router.get('/next', protect, restrictTo('admin'), ctrl.claimNextJob);
router.post('/:id/complete', protect, restrictTo('admin'), ctrl.completeJob);
router.post('/:id/fail', protect, restrictTo('admin'), ctrl.failJob);

module.exports = router;
