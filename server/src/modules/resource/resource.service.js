'use strict';

const ResourceModel = require('../../database/models/resource.model');
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} = require('../../integrations/cloudinary');
const {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} = require('../../common/utils/errors-utils');
const { ErrorCode } = require('../../common/enums/error-code.enum');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Determine Cloudinary resource type from a URL or filename extension.
 * Cloudinary only accepts: 'image', 'video', 'raw'
 */
function getCloudinaryResourceType(url) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', '.ico'];
  const videoExts = ['.mp4', '.mpeg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];

  const ext = path.extname(url).toLowerCase();

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return 'raw'; // pdf, doc, ppt, xls, txt, zip, etc.
}

class ResourceService {
  /**
   * Get all resources with optional filtering
   */
  async getAllResources(filters = {}) {
    const { type, tutorId, search, limit = 20, skip = 0 } = filters;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (tutorId) {
      query.tutor_id = tutorId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const resources = await ResourceModel.find(query)
      .populate('tutor_id', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ResourceModel.countDocuments(query);

    return { resources, total };
  }

  /**
   * Get resource by ID
   */
  async getResourceById(resourceId) {
    const resource = await ResourceModel.findById(resourceId).populate('tutor_id', 'name email');

    if (!resource) {
      throw new NotFoundException('Resource not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    return resource;
  }

  /**
   * Create a new resource with file upload
   */
  async createResource(tutorId, resourceData, file) {
    if (!file) {
      throw new BadRequestException('File is required', ErrorCode.VALIDATION_ERROR);
    }

    const { title, description, type } = resourceData;

    // Validate required fields
    if (!title || !description || !type) {
      throw new BadRequestException(
        'Title, description, and type are required',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    // Create a temporary file from buffer
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
    await fs.writeFile(tempFilePath, file.buffer);

    try {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(tempFilePath, 'peer-pulse/resources', 'auto');

      // Create resource in database
      const resource = await ResourceModel.create({
        title,
        description,
        type,
        cloudinary_url: uploadResult.secure_url,
        tutor_id: tutorId,
      });

      // Clean up temp file
      await fs.unlink(tempFilePath);

      const populatedResource = await ResourceModel.findById(resource._id).populate(
        'tutor_id',
        'name email',
      );

      return populatedResource;
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      throw error;
    }
  }

  /**
   * Update resource
   */
  async updateResource(resourceId, tutorId, updateData, file) {
    console.log('[updateResource] resourceId:', resourceId);
    console.log('[updateResource] tutorId:', tutorId);
    console.log('[updateResource] updateData:', updateData);
    console.log('[updateResource] file:', file);
    const resource = await ResourceModel.findById(resourceId);

    if (!resource) {
      console.error('[updateResource] Resource not found:', resourceId);
      throw new NotFoundException('Resource not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // Check if user is the owner
    if (resource.tutor_id.toString() !== tutorId.toString()) {
      console.error(
        '[updateResource] Unauthorized update attempt. Resource tutor_id:',
        resource.tutor_id,
        'Provided tutorId:',
        tutorId,
      );
      throw new UnauthorizedException(
        'You are not authorized to update this resource',
        ErrorCode.ACCESS_UNAUTHORIZED,
      );
    }

    const { title, description, type } = updateData;

    // Update basic fields
    if (title) resource.title = title;
    if (description) resource.description = description;
    if (type) resource.type = type;
    console.log('[updateResource] Updated fields:', { title, description, type });

    // If new file is uploaded, replace the old one
    if (file) {
      console.log('[updateResource] File provided:', file);
      const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
      await fs.writeFile(tempFilePath, file.buffer);

      try {
        // Delete old file from Cloudinary
        const oldPublicId = extractPublicId(resource.cloudinary_url);
        if (oldPublicId) {
          const oldResourceType = getCloudinaryResourceType(resource.cloudinary_url);
          console.log('[updateResource] Deleting old file with type:', oldResourceType);
          await deleteFromCloudinary(oldPublicId, oldResourceType);
        }

        // Upload new file
        const uploadResult = await uploadToCloudinary(tempFilePath, 'peer-pulse/resources', 'auto');
        resource.cloudinary_url = uploadResult.secure_url;

        // Clean up temp file
        await fs.unlink(tempFilePath);
        console.log(
          '[updateResource] File upload and replacement successful. New URL:',
          uploadResult.secure_url,
        );
      } catch (error) {
        // Clean up temp file if it exists
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          // Ignore unlink errors
        }
        console.error('[updateResource] Error during file upload/replacement:', error);
        throw error;
      }
    } else {
      console.log('[updateResource] No file provided for update.');
    }

    await resource.save();

    const updatedResource = await ResourceModel.findById(resource._id).populate(
      'tutor_id',
      'name email',
    );
    console.log('[updateResource] Resource updated successfully:', updatedResource);
    return updatedResource;
  }

  /**
   * Delete resource
   */
  async deleteResource(resourceId, tutorId) {
    const resource = await ResourceModel.findById(resourceId);

    if (!resource) {
      throw new NotFoundException('Resource not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // Check if user is the owner
    if (resource.tutor_id.toString() !== tutorId.toString()) {
      throw new UnauthorizedException(
        'You are not authorized to delete this resource',
        ErrorCode.ACCESS_UNAUTHORIZED,
      );
    }

    // Delete file from Cloudinary
    const publicId = extractPublicId(resource.cloudinary_url);
    if (publicId) {
      try {
        const resourceType = getCloudinaryResourceType(resource.cloudinary_url);
        await deleteFromCloudinary(publicId, resourceType);
      } catch (error) {
        // Log error but continue with database deletion
        console.error('Error deleting from Cloudinary:', error.message);
      }
    }

    await ResourceModel.findByIdAndDelete(resourceId);

    return { message: 'Resource deleted successfully' };
  }

  /**
   * Search resources
   */
  async searchResources(searchQuery, filters = {}) {
    const { type, limit = 20, skip = 0 } = filters;

    const query = {
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ],
    };

    if (type) {
      query.type = type;
    }

    const resources = await ResourceModel.find(query)
      .populate('tutor_id', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ResourceModel.countDocuments(query);

    return { resources, total };
  }
}

module.exports = new ResourceService();
