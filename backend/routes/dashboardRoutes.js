const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Statistics, hazards and the map feed are public: anyone can see reported hazards.
router.get('/statistics', ctrl.getStatistics);
router.get('/hazards', ctrl.getHazardBreakdown);
router.get('/map', ctrl.getMapData);

// Pipeline health is operational data, so it stays behind staff auth.
router.get('/pipeline', protect, restrictTo('authority', 'admin'), ctrl.getPipeline);

module.exports = router;
