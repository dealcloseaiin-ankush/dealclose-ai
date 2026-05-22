const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary using your .env keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dealclose_assets', // Cloudinary me is folder me save hoga
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'xlsx', 'csv'],
    resource_type: 'auto' // Supports images, pdfs, and raw files automatically
  },
});

const upload = multer({ storage: storage });

// @route POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  
  // Cloudinary automatically gives us the secure cloud URL
  const fileUrl = req.file.path;
  res.status(200).json({ success: true, url: fileUrl, public_id: req.file.filename });
});

module.exports = router;