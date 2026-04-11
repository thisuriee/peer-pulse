const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/database/models/resource.model', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock('../../../src/database/models/library-access.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../../src/integrations/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
  extractPublicId: jest.fn(),
  normalizeResourceType: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

const ResourceModel = require('../../../src/database/models/resource.model');
const LibraryAccessModel = require('../../../src/database/models/library-access.model');
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
  normalizeResourceType,
} = require('../../../src/integrations/cloudinary');
const fs = require('fs').promises;
const resourceService = require('../../../src/modules/resource/resource.service');
const {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} = require('../../../src/common/utils/errors-utils');

describe('ResourceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllResources', () => {
    const createQueryChain = (resolvedValue) => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue(resolvedValue),
    });

    it('returns tutor resources for tutor role with filters and pagination', async () => {
      const resources = [{ _id: 'r1', title: 'Doc 1' }];
      const chain = createQueryChain(resources);
      ResourceModel.find.mockReturnValue(chain);
      ResourceModel.countDocuments.mockResolvedValue(1);

      const result = await resourceService.getAllResources('tutor-1', 'tutor', {
        type: 'document',
        search: 'doc',
        limit: '1',
        skip: '0',
      });

      expect(ResourceModel.find).toHaveBeenCalledWith({
        type: 'document',
        tutor_id: 'tutor-1',
        $or: [
          { title: { $regex: 'doc', $options: 'i' } },
          { description: { $regex: 'doc', $options: 'i' } },
        ],
      });
      expect(result).toEqual({ resources, total: 1 });
    });

    it('throws when student does not provide tutorId', async () => {
      await expect(resourceService.getAllResources('student-1', 'student', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when student has no approved access', async () => {
      LibraryAccessModel.findOne.mockResolvedValue(null);

      await expect(
        resourceService.getAllResources('student-1', 'student', { tutorId: 'tutor-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns resources when student has approved access', async () => {
      LibraryAccessModel.findOne.mockResolvedValue({ _id: 'access-1' });
      const resources = [{ _id: 'r1', title: 'Shared doc' }];
      const chain = createQueryChain(resources);
      ResourceModel.find.mockReturnValue(chain);
      ResourceModel.countDocuments.mockResolvedValue(1);

      const result = await resourceService.getAllResources('student-1', 'student', {
        tutorId: 'tutor-1',
        limit: '1',
        skip: '0',
      });

      expect(LibraryAccessModel.findOne).toHaveBeenCalledWith({
        student_id: 'student-1',
        tutor_id: 'tutor-1',
        status: 'approved',
      });
      expect(result.resources).toHaveLength(1);
    });
  });

  describe('getResourceById', () => {
    it('throws not found when resource does not exist', async () => {
      ResourceModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(resourceService.getResourceById('missing-id', 'u1', 'tutor')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws unauthorized when tutor is not owner', async () => {
      ResourceModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: 'r1',
          tutor_id: { _id: 'other-tutor' },
        }),
      });

      await expect(resourceService.getResourceById('r1', 'tutor-1', 'tutor')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws unauthorized when student has no approved access', async () => {
      ResourceModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: 'r1',
          tutor_id: { _id: 'tutor-1' },
        }),
      });
      LibraryAccessModel.findOne.mockResolvedValue(null);

      await expect(resourceService.getResourceById('r1', 'student-1', 'student')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createResource', () => {
    it('rejects missing required fields', async () => {
      await expect(
        resourceService.createResource('t1', { title: '', type: 'document' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates link resource when type is link and linkUrl provided', async () => {
      ResourceModel.create.mockResolvedValue({ _id: 'r-link' });
      ResourceModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'r-link', type: 'link' }),
      });

      const result = await resourceService.createResource(
        'tutor-1',
        {
          title: 'Reference',
          description: 'Useful link',
          type: 'link',
          linkUrl: 'https://example.com',
        },
        null,
      );

      expect(ResourceModel.create).toHaveBeenCalledWith({
        title: 'Reference',
        description: 'Useful link',
        type: 'link',
        category: 'General',
        cloudinary_url: 'https://example.com',
        tutor_id: 'tutor-1',
      });
      expect(result._id).toBe('r-link');
    });

    it('rejects non-link resource when file is missing', async () => {
      await expect(
        resourceService.createResource(
          'tutor-1',
          { title: 'Doc', description: 'Desc', type: 'document' },
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('uploads file resource and persists cloudinary URL', async () => {
      normalizeResourceType.mockReturnValue('raw');
      uploadToCloudinary.mockResolvedValue({ secure_url: 'https://cdn.example.com/file.pdf' });
      ResourceModel.create.mockResolvedValue({ _id: 'r-file' });
      ResourceModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'r-file', type: 'document' }),
      });

      const file = {
        originalname: 'notes.pdf',
        buffer: Buffer.from('pdf-content'),
      };

      const result = await resourceService.createResource(
        'tutor-1',
        { title: 'Doc', description: 'Desc', type: 'document', category: 'Math' },
        file,
      );

      expect(fs.writeFile).toHaveBeenCalled();
      expect(uploadToCloudinary).toHaveBeenCalled();
      expect(ResourceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Doc',
          category: 'Math',
          cloudinary_url: 'https://cdn.example.com/file.pdf',
        }),
      );
      expect(fs.unlink).toHaveBeenCalled();
      expect(result._id).toBe('r-file');
    });
  });

  describe('updateResource', () => {
    it('throws when resource is not found', async () => {
      ResourceModel.findById.mockResolvedValue(null);

      await expect(resourceService.updateResource('missing', 'tutor-1', {}, null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when tutor is not owner', async () => {
      ResourceModel.findById.mockResolvedValue({
        tutor_id: { toString: () => 'other-tutor' },
      });

      await expect(resourceService.updateResource('r1', 'tutor-1', {}, null)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('updates metadata only without replacing file', async () => {
      const resource = {
        _id: 'r1',
        tutor_id: { toString: () => 'tutor-1' },
        title: 'Old',
        description: 'Old desc',
        category: 'Old cat',
        type: 'document',
        cloudinary_url: 'https://res.cloudinary.com/demo/upload/v1/folder/file.pdf',
        save: jest.fn().mockResolvedValue(true),
      };
      ResourceModel.findById
        .mockResolvedValueOnce(resource)
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({ _id: 'r1', title: 'New' }),
        });

      const result = await resourceService.updateResource(
        'r1',
        'tutor-1',
        { title: 'New', description: 'New desc', category: 'New cat' },
        null,
      );

      expect(resource.title).toBe('New');
      expect(resource.description).toBe('New desc');
      expect(resource.category).toBe('New cat');
      expect(resource.save).toHaveBeenCalled();
      expect(result._id).toBe('r1');
    });

    it('replaces file and old cloudinary resource when file provided', async () => {
      const resource = {
        _id: 'r1',
        tutor_id: { toString: () => 'tutor-1' },
        type: 'document',
        cloudinary_url: 'https://res.cloudinary.com/demo/upload/v123/peer-pulse/resources/old.pdf',
        save: jest.fn().mockResolvedValue(true),
      };

      ResourceModel.findById.mockResolvedValueOnce(resource).mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({ _id: 'r1', cloudinary_url: 'https://new' }),
      });

      extractPublicId.mockReturnValue('peer-pulse/resources/old');
      normalizeResourceType.mockReturnValue('raw');
      uploadToCloudinary.mockResolvedValue({ secure_url: 'https://new' });

      await resourceService.updateResource(
        'r1',
        'tutor-1',
        { type: 'document' },
        { originalname: 'new.pdf', buffer: Buffer.from('new') },
      );

      expect(deleteFromCloudinary).toHaveBeenCalled();
      expect(uploadToCloudinary).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
      expect(resource.cloudinary_url).toBe('https://new');
    });
  });

  describe('deleteResource', () => {
    it('deletes owned resource and cloudinary asset', async () => {
      ResourceModel.findById.mockResolvedValue({
        _id: 'r1',
        tutor_id: { toString: () => 'tutor-1' },
        cloudinary_url: 'https://res.cloudinary.com/demo/upload/v123/peer-pulse/resources/doc.pdf',
      });
      extractPublicId.mockReturnValue('peer-pulse/resources/doc');
      deleteFromCloudinary.mockResolvedValue({ result: 'ok' });
      ResourceModel.findByIdAndDelete.mockResolvedValue({ _id: 'r1' });

      const result = await resourceService.deleteResource('r1', 'tutor-1');

      expect(deleteFromCloudinary).toHaveBeenCalled();
      expect(ResourceModel.findByIdAndDelete).toHaveBeenCalledWith('r1');
      expect(result).toEqual({ message: 'Resource deleted successfully' });
    });

    it('throws unauthorized when deleting another tutor resource', async () => {
      ResourceModel.findById.mockResolvedValue({
        tutor_id: { toString: () => 'other-tutor' },
      });

      await expect(resourceService.deleteResource('r1', 'tutor-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('searchResources', () => {
    it('searches with optional type and returns paginated results', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([{ _id: 'r1', title: 'Algebra' }]),
      };
      ResourceModel.find.mockReturnValue(chain);
      ResourceModel.countDocuments.mockResolvedValue(1);

      const result = await resourceService.searchResources('alg', {
        type: 'document',
        limit: '1',
        skip: '0',
      });

      expect(ResourceModel.find).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'alg', $options: 'i' } },
          { description: { $regex: 'alg', $options: 'i' } },
        ],
        type: 'document',
      });
      expect(result).toEqual({ resources: [{ _id: 'r1', title: 'Algebra' }], total: 1 });
    });
  });
});
