const multer = require('multer');
const { ApiError } = require('./errorHandler');

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// memoryStorage keeps files out of the filesystem, which Vercel functions do not persist.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new ApiError(415, 'Only JPG, PNG or WEBP images are accepted'));
    }
    cb(null, true);
  },
});

module.exports = { upload, MAX_BYTES, ALLOWED };
