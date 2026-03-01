// @ts-nocheck
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
const { getPresignedUploadUrl, uploadToCloudinary } = require('../controllers/uploadController');

const router = express.Router();

router.post('/presigned-url', authMiddleware, getPresignedUploadUrl);
// Cloudinary upload (multipart/form-data) — field name: `file`
router.post('/cloudinary', authMiddleware, upload.single('file'), uploadToCloudinary);
// Unprotected test endpoint to debug uploads (remove or protect in production)
router.post('/cloudinary/test', upload.single('file'), uploadToCloudinary);
router.post('/cloudinary-test', upload.single('file'), uploadToCloudinary);

module.exports = router;


