const express = require('express');
const ctrl = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/users', ctrl.listUsers);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.post('/reports/:id/resolve', ctrl.setResolution);
router.delete('/reports/:id', ctrl.deleteReportAsAdmin);

module.exports = router;
