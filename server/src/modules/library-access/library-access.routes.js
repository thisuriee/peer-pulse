'use strict';

const express = require('express');
const libraryAccessController = require('./library-access.controller');
const { authenticateJWT } = require('../../common/middleware/auth.middleware');
const requireRole = require('../../common/guards/role.guard').requireRole;
const Roles = { STUDENT: 'student', TUTOR: 'tutor' };

const router = express.Router();

/**
 * @route POST /api/library-access/:tutorId/request
 * @desc Request access to a tutor's library.
 * @access Private (Student)
 */
router.post(
  '/:tutorId/request',
  authenticateJWT,
  requireRole(Roles.STUDENT),
  libraryAccessController.requestAccess,
);

/**
 * @route PATCH /api/library-access/:requestId/status
 * @desc Update the status of an access request (approve, reject, revoke)
 * @access Private (Tutor)
 * @body { "status": "approved" | "rejected" | "revoked" }
 */
router.patch(
  '/:requestId/status',
  authenticateJWT,
  requireRole(Roles.TUTOR),
  libraryAccessController.updateAccessStatus,
);

/**
 * @route GET /api/library-access/tutor-requests
 * @desc Get all incoming access requests for a tutor.
 * @access Private (Tutor)
 */
router.get(
  '/tutor-requests',
  authenticateJWT,
  requireRole(Roles.TUTOR),
  libraryAccessController.getTutorRequests,
);

/**
 * @route GET /api/library-access/student-accesses
 * @desc Get all libraries a student has access to or requested access to.
 * @access Private (Student)
 */
router.get(
  '/student-accesses',
  authenticateJWT,
  requireRole(Roles.STUDENT),
  libraryAccessController.getStudentAccesses,
);

/**
 * @route GET /api/library-access/tutors
 * @desc Get tutor directory for students with access status.
 * @access Private (Student)
 */
router.get(
  '/tutors',
  authenticateJWT,
  requireRole(Roles.STUDENT),
  libraryAccessController.getTutorDirectory,
);

module.exports = router;
