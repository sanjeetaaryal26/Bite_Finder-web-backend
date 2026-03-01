// @ts-nocheck
const cloudinary = require('../config/cloudinary');

const ALLOWED_FOLDERS = ['restaurants', 'foods', 'profiles'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getPresignedUploadUrl = async (req, res, next) => {
  try {
    // S3 presigned flow is deprecated for this project — use Cloudinary instead.
    // Return the backend Cloudinary endpoint so the frontend can POST multipart/form-data.
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return res.status(200).json({
      success: true,
      message: 'Use Cloudinary upload endpoint',
      data: {
        uploadURL: `${backendUrl}/api/upload/cloudinary`,
        fileURL: '',
      },
    });
  } catch (error) {
    console.error('Error in getPresignedUploadUrl fallback:', error);
    return next(error);
  }
};

const uploadToCloudinary = async (req, res, next) => {
  try {
    console.log('uploadToCloudinary called');
    console.log('CLOUDINARY envs:', {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    });
    console.log('req.user:', req.user ? { id: req.user.id, role: req.user.role } : null);
    console.log('req.body keys:', Object.keys(req.body || {}));
    if (req.file) console.log('req.file:', { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
    // multer memoryStorage will place the file buffer on req.file
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const folder = req.body.folder || process.env.CLOUDINARY_FOLDER || 'bite_finder';

    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        stream.end(buffer);
      });

    console.log('Starting stream upload, buffer length:', req.file.buffer ? req.file.buffer.length : 0);
    const result = await streamUpload(req.file.buffer);
    console.log('Cloudinary result:', result && result.public_id ? { public_id: result.public_id } : result);

    return res.status(200).json({
      success: true,
      message: 'File uploaded to Cloudinary',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return next(error);
  }
};

module.exports = {
  getPresignedUploadUrl,
  uploadToCloudinary,
};


