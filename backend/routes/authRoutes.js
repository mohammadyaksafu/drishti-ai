const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name needs 2–80 characters'),
    body('email').isEmail().withMessage('Enter a valid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password needs at least 8 characters'),
  ],
  ctrl.register
);

router.post(
  '/login',
  [body('email').isEmail().withMessage('Enter a valid email address'), body('password').notEmpty().withMessage('Enter your password')],
  ctrl.login
);

router.get('/me', protect, ctrl.me);
router.put('/me', protect, ctrl.updateProfile);
router.put('/password', protect, ctrl.changePassword);

module.exports = router;
