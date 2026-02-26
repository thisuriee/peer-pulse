'use strict';

const cloudinary = require('cloudinary').v2;
const { config } = require('../config/app.config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY.CLOUD_NAME,
  api_key: config.CLOUDINARY.API_KEY,
  api_secret: config.CLOUDINARY.API_SECRET,
  secure: true,
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the file to upload
 * @param {string} folder - Folder name in Cloudinary
 * @param {string} resourceType - Type of resource (image, video, raw, auto)
 * @returns {Promise} Upload result
 */
const uploadToCloudinary = async (
  filePath,
  folder = 'peer-pulse/resources',
  resourceType = 'auto',
) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the resource
 * @param {string} resourceType - Type of resource (image, video, raw)
 * @returns {Promise} Delete result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
const extractPublicId = (url) => {
  if (!url) return null;

  // Extract public ID from URL
  // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');

  if (uploadIndex === -1) return null;

  // Get everything after upload, excluding version (v1234567890)
  let publicId = parts.slice(uploadIndex + 2).join('/');

  // Remove file extension
  publicId = publicId.replace(/\.[^/.]+$/, '');

  return publicId;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
};
