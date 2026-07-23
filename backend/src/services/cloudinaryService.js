const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadToCloudinary = async (file, folder = 'dealclose_assets') => {
  try {
    const options = { folder, resource_type: 'auto' };

    if (Buffer.isBuffer(file)) {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        stream.end(file);
      });
    }

    if (typeof file !== 'string' || !file) {
      throw new Error('A file buffer or path is required for upload.');
    }

    const result = await cloudinary.uploader.upload(file, options);
    // Only disk-backed uploads have a temporary file to remove.
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return result;
  } catch (error) {
    console.error("Cloudinary Upload Service Error:", error);
    throw new Error("Failed to upload file to Cloudinary.");
  }
};
