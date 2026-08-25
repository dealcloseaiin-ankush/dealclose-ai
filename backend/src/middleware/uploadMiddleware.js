const multer = require('multer');
const fs = require('fs');

// Ensure the uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Configure multer for temporary file storage with 50MB field size limits
exports.upload = multer({
  dest: 'uploads/',
  limits: {
    fieldSize: 50 * 1024 * 1024,
    fileSize: 50 * 1024 * 1024
  }
});