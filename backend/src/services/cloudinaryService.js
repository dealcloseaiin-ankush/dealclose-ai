const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadToCloudinary = async (filePath, folder = 'dealclose_assets') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder, resource_type: 'auto' });
    // Delete the temporary file from server memory after successful upload
    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    console.error("Cloudinary Upload Service Error:", error);
    throw new Error("Failed to upload file to Cloudinary.");
  }
};