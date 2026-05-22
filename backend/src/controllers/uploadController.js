const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image file provided." });

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'dealclose_templates' });

    // Delete the temporary file from server memory
    fs.unlinkSync(req.file.path);

    res.status(200).json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    res.status(500).json({ success: false, message: "Failed to upload image to Cloudinary." });
  }
};