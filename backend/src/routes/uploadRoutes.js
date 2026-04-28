const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Set up local storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Public/uploads folder me save karega (is folder ko backend me bana lijiye)
    cb(null, 'public/uploads/'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// @route POST /api/upload
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ imageUrl: fileUrl });
});

module.exports = router;