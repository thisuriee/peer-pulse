'use strict';

const libraryAccessService = require('./library-access.service');
const { asyncHandler } = require('../../middlewares/helpers/async-handler.middleware');
const { HTTPSTATUS } = require('../../config/http.config');

class LibraryAccessController {
  /**
   * @description Request access to a tutor's library.
   * @route POST /api/library-access/request/:tutorId
   * @access Private (Student)
   */
  requestAccess = asyncHandler(async (req, res) => {
    const studentId = req.user._id || req.user.id;
    const { tutorId } = req.params;

    const accessRequest = await libraryAccessService.requestAccess(studentId, tutorId);

    return res.status(HTTPSTATUS.CREATED).json({
      message: 'Access requested successfully.',
      data: accessRequest,
    });
  });

  /**
   * @description Update the status of an access request (approve/reject/revoke).
   * @route PATCH /api/library-access/status/:requestId
   * @access Private (Tutor)
   */
  updateAccessStatus = asyncHandler(async (req, res) => {
    const tutorId = req.user._id || req.user.id;
    const { requestId } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'revoked'

    const updatedRequest = await libraryAccessService.updateAccessStatus(
      tutorId,
      requestId,
      status,
    );

    return res.status(HTTPSTATUS.OK).json({
      message: `Access request ${status} successfully.`,
      data: updatedRequest,
    });
  });

  /**
   * @description Get all access requests for a tutor.
   * @route GET /api/library-access/tutor-requests
   * @access Private (Tutor)
   */
  getTutorRequests = asyncHandler(async (req, res) => {
    const tutorId = req.user._id || req.user.id;
    const { status } = req.query;

    const requests = await libraryAccessService.getTutorRequests(tutorId, { status });

    return res.status(HTTPSTATUS.OK).json({
      message: 'Access requests retrieved successfully.',
      data: requests,
    });
  });

  /**
   * @description Get all libraries a student has requested or has access to.
   * @route GET /api/library-access/student-accesses
   * @access Private (Student)
   */
  getStudentAccesses = asyncHandler(async (req, res) => {
    const studentId = req.user._id || req.user.id;
    const { status } = req.query;

    const accesses = await libraryAccessService.getStudentAccesses(studentId, { status });

    return res.status(HTTPSTATUS.OK).json({
      message: 'Library accesses retrieved successfully.',
      data: accesses,
    });
  });

  /**
   * @description Get tutor directory with access status for a student.
   * @route GET /api/library-access/tutors
   * @access Private (Student)
   */
  getTutorDirectory = asyncHandler(async (req, res) => {
    const studentId = req.user._id || req.user.id;
    const { search } = req.query;

    const tutors = await libraryAccessService.getTutorDirectory(studentId, { search });

    return res.status(HTTPSTATUS.OK).json({
      message: 'Tutor directory retrieved successfully.',
      data: tutors,
    });
  });
}

module.exports = new LibraryAccessController();
