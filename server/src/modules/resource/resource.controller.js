'use strict';

const { asyncHandler } = require('../../middlewares/helpers/async-handler.middleware');
const { HTTPSTATUS } = require('../../config/http.config');
const resourceService = require('./resource.service');

class ResourceController {
  /**
   * Get all resources
   * GET /api/v1/resources
   */
  getAllResources = asyncHandler(async (req, res) => {
    const { type, tutorId, search, limit, skip } = req.query;

    const filters = {
      type,
      tutorId,
      search,
      limit,
      skip,
    };

    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    const result = await resourceService.getAllResources(userId, userRole, filters);

    return res.status(HTTPSTATUS.OK).json({
      message: 'Resources retrieved successfully',
      data: result.resources,
      total: result.total,
    });
  });

  /**
   * Get resource by ID
   * GET /api/v1/resources/:id
   */
  getResourceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    const resource = await resourceService.getResourceById(id, userId, userRole);

    return res.status(HTTPSTATUS.OK).json({
      message: 'Resource retrieved successfully',
      data: resource,
    });
  });

  /**
   * Create a new resource
   * POST /api/v1/resources
   */
  createResource = asyncHandler(async (req, res) => {
    const tutorId = req.user.id; // From authenticateJWT middleware
    const { title, description, type, category, linkUrl } = req.body;
    const file = req.file; // From multer middleware

    const resource = await resourceService.createResource(
      tutorId,
      { title, description, type, category, linkUrl },
      file,
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: 'Resource created successfully',
      data: resource,
    });
  });

  /**
   * Update resource
   * PUT /api/v1/resources/:id
   */
  updateResource = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tutorId = req.user.id;
    const { title, description, type, category, linkUrl } = req.body;
    const file = req.file;

    const resource = await resourceService.updateResource(
      id,
      tutorId,
      { title, description, type, category, linkUrl },
      file,
    );

    return res.status(HTTPSTATUS.OK).json({
      message: 'Resource updated successfully',
      data: resource,
    });
  });

  /**
   * Delete resource
   * DELETE /api/v1/resources/:id
   */
  deleteResource = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tutorId = req.user.id;

    const result = await resourceService.deleteResource(id, tutorId);

    return res.status(HTTPSTATUS.OK).json({
      message: result.message,
    });
  });

  /**
   * Search resources
   * GET /api/v1/resources/search
   */
  searchResources = asyncHandler(async (req, res) => {
    const { q, type, limit, skip } = req.query;

    if (!q) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: 'Search query is required',
      });
    }

    const filters = { type, limit, skip };
    const result = await resourceService.searchResources(q, filters);

    return res.status(HTTPSTATUS.OK).json({
      message: 'Search completed successfully',
      data: result.resources,
      total: result.total,
    });
  });
}

module.exports = new ResourceController();
