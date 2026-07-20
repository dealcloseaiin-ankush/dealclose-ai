const multer = require('multer');
const fs = require('fs');

// Ensure the uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Configure multer for temporary file storage
exports.upload = multer({ dest: 'uploads/' });