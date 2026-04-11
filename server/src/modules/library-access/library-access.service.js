'use strict';

const LibraryAccessModel = require('../../database/models/library-access.model');
const UserModel = require('../../database/models/user.model');
const { NotFoundException, BadRequestException } = require('../../common/utils/errors-utils');
const { ErrorCode } = require('../../common/enums/error-code.enum');

class LibraryAccessService {
  /**
   * Request access to a tutor's library.
   * @param {string} studentId - The ID of the student requesting access.
   * @param {string} tutorId - The ID of the tutor whose library access is requested.
   * @returns {Object} The created or existing pending access request.
   */
  async requestAccess(studentId, tutorId) {
    if (studentId.toString() === tutorId.toString()) {
      throw new BadRequestException(
        'You cannot request access to your own library.',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const existingRequest = await LibraryAccessModel.findOne({
      student_id: studentId,
      tutor_id: tutorId,
    });

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        throw new BadRequestException(
          'You already have access to this library.',
          ErrorCode.VALIDATION_ERROR,
        );
      } else if (existingRequest.status === 'pending') {
        throw new BadRequestException(
          'You already have a pending request for this library.',
          ErrorCode.VALIDATION_ERROR,
        );
      } else {
        // If rejected or revoked, allow re-requesting by updating status back to pending
        existingRequest.status = 'pending';
        await existingRequest.save();
        return existingRequest;
      }
    }

    const accessRequest = await LibraryAccessModel.create({
      student_id: studentId,
      tutor_id: tutorId,
      status: 'pending',
    });

    return accessRequest;
  }

  /**
   * Update the status of an access request (approve, reject, revoke).
   * @param {string} tutorId - The ID of the tutor updating the access.
   * @param {string} requestId - The ID of the LibraryAccess document.
   * @param {string} status - The new status ('approved', 'rejected', 'revoked').
   * @returns {Object} The updated access request.
   */
  async updateAccessStatus(tutorId, requestId, status) {
    const validStatuses = ['approved', 'rejected', 'revoked'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status.', ErrorCode.VALIDATION_ERROR);
    }

    const accessRequest = await LibraryAccessModel.findOne({
      _id: requestId,
      tutor_id: tutorId,
    });

    if (!accessRequest) {
      throw new NotFoundException('Access request not found.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    accessRequest.status = status;
    await accessRequest.save();

    return accessRequest;
  }

  /**
   * Get all incoming access requests for a tutor.
   * @param {string} tutorId - The ID of the tutor.
   * @param {Object} query - Filtering options (e.g., status).
   * @returns {Array} List of access requests.
   */
  async getTutorRequests(tutorId, query = {}) {
    const filter = { tutor_id: tutorId };
    if (query.status) {
      filter.status = query.status;
    }

    const requests = await LibraryAccessModel.find(filter)
      .populate('student_id', 'name email avatar')
      .sort({ createdAt: -1 });

    return requests;
  }

  /**
   * Get all libraries a student has access to or has requested access to.
   * @param {string} studentId - The ID of the student.
   * @param {Object} query - Filtering options (e.g., status).
   * @returns {Array} List of library access records.
   */
  async getStudentAccesses(studentId, query = {}) {
    const filter = { student_id: studentId };
    if (query.status) {
      filter.status = query.status;
    }

    const accesses = await LibraryAccessModel.find(filter)
      .populate('tutor_id', 'name email avatar')
      .sort({ createdAt: -1 });

    return accesses;
  }

  /**
   * Get a tutor directory for a student including access status.
   * @param {string} studentId - The ID of the student.
   * @param {Object} query - Optional filters.
   * @returns {Array} Tutors with access status for this student.
   */
  async getTutorDirectory(studentId, query = {}) {
    const { search = '' } = query;

    const tutorFilter = { role: 'tutor' };
    if (search) {
      tutorFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const tutors = await UserModel.find(tutorFilter)
      .select('_id name email bio')
      .sort({ name: 1 })
      .lean();

    if (!tutors.length) {
      return [];
    }

    const tutorIds = tutors.map((tutor) => tutor._id);
    const accessRecords = await LibraryAccessModel.find({
      student_id: studentId,
      tutor_id: { $in: tutorIds },
    })
      .select('tutor_id status')
      .lean();

    const statusByTutorId = new Map(
      accessRecords.map((record) => [record.tutor_id.toString(), record.status]),
    );

    return tutors.map((tutor) => ({
      ...tutor,
      accessStatus: statusByTutorId.get(tutor._id.toString()) || 'none',
    }));
  }
}

module.exports = new LibraryAccessService();
