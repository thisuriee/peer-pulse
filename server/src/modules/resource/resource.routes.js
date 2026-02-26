'use strict';

const { Router } = require('express');
const { authenticateJWT, optionalAuth } = require('../../common/middleware/auth.middleware');
const { upload } = require('../../middlewares/core/upload.middleware');
const resourceController = require('./resource.controller');

const resourceRoutes = Router();

// ============================================
// Component 2: Knowledge Vault (Imadh)
// Resource & Content Management
// ============================================

// GET /api/v1/resources/search - Search resources (must come before /:id)
resourceRoutes.get('/search', optionalAuth, resourceController.searchResources);

// GET /api/v1/resources - Get all resources (public, optional auth for tracking)
resourceRoutes.get('/', optionalAuth, resourceController.getAllResources);

// GET /api/v1/resources/:id - Get resource by ID
resourceRoutes.get('/:id', optionalAuth, resourceController.getResourceById);

// POST /api/v1/resources - Upload a new resource (authenticated)
resourceRoutes.post('/', authenticateJWT, upload.single('file'), resourceController.createResource);

// PUT /api/v1/resources/:id - Update resource (authenticated, owner only)
resourceRoutes.put(
  '/:id',
  authenticateJWT,
  upload.single('file'),
  resourceController.updateResource,
);

// DELETE /api/v1/resources/:id - Delete resource (authenticated, owner only)
resourceRoutes.delete('/:id', authenticateJWT, resourceController.deleteResource);

module.exports = resourceRoutes;
