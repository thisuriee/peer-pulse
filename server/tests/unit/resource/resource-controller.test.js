const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../src/modules/resource/resource.service', () => ({
  getAllResources: jest.fn(),
  getResourceById: jest.fn(),
  createResource: jest.fn(),
  updateResource: jest.fn(),
  deleteResource: jest.fn(),
  searchResources: jest.fn(),
}));

const resourceService = require('../../../src/modules/resource/resource.service');
const resourceController = require('../../../src/modules/resource/resource.controller');
const { HTTPSTATUS } = require('../../../src/config/http.config');

describe('ResourceController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-1', _id: 'user-1', role: 'tutor' },
      params: {},
      query: {},
      body: {},
      file: undefined,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('getAllResources returns resources and total', async () => {
    resourceService.getAllResources.mockResolvedValue({ resources: [{ _id: 'r1' }], total: 1 });

    await resourceController.getAllResources(req, res, next);

    expect(resourceService.getAllResources).toHaveBeenCalledWith('user-1', 'tutor', {
      type: undefined,
      tutorId: undefined,
      search: undefined,
      limit: undefined,
      skip: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Resources retrieved successfully',
      data: [{ _id: 'r1' }],
      total: 1,
    });
  });

  it('getResourceById returns single resource', async () => {
    req.params.id = 'r1';
    resourceService.getResourceById.mockResolvedValue({ _id: 'r1', title: 'Doc' });

    await resourceController.getResourceById(req, res, next);

    expect(resourceService.getResourceById).toHaveBeenCalledWith('r1', 'user-1', 'tutor');
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Resource retrieved successfully',
      data: { _id: 'r1', title: 'Doc' },
    });
  });

  it('createResource sends created response', async () => {
    req.body = { title: 'Doc', description: 'Desc', type: 'document' };
    req.file = { originalname: 'doc.pdf', buffer: Buffer.from('pdf') };
    resourceService.createResource.mockResolvedValue({ _id: 'r1' });

    await resourceController.createResource(req, res, next);

    expect(resourceService.createResource).toHaveBeenCalledWith(
      'user-1',
      {
        title: 'Doc',
        description: 'Desc',
        type: 'document',
        category: undefined,
        linkUrl: undefined,
      },
      req.file,
    );
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Resource created successfully',
      data: { _id: 'r1' },
    });
  });

  it('updateResource sends success response', async () => {
    req.params.id = 'r1';
    req.body = { title: 'Updated title' };
    resourceService.updateResource.mockResolvedValue({ _id: 'r1', title: 'Updated title' });

    await resourceController.updateResource(req, res, next);

    expect(resourceService.updateResource).toHaveBeenCalledWith(
      'r1',
      'user-1',
      {
        title: 'Updated title',
        description: undefined,
        type: undefined,
        category: undefined,
        linkUrl: undefined,
      },
      undefined,
    );
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  });

  it('deleteResource sends delete confirmation', async () => {
    req.params.id = 'r1';
    resourceService.deleteResource.mockResolvedValue({ message: 'Resource deleted successfully' });

    await resourceController.deleteResource(req, res, next);

    expect(resourceService.deleteResource).toHaveBeenCalledWith('r1', 'user-1');
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
    expect(res.json).toHaveBeenCalledWith({ message: 'Resource deleted successfully' });
  });

  it('searchResources returns 400 when query is missing', async () => {
    req.query = { type: 'document' };

    await resourceController.searchResources(req, res, next);

    expect(resourceService.searchResources).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: 'Search query is required' });
  });

  it('searchResources returns search result when q is provided', async () => {
    req.query = { q: 'calculus', type: 'document', limit: '1', skip: '0' };
    resourceService.searchResources.mockResolvedValue({
      resources: [{ _id: 'r1', title: 'Calculus Notes' }],
      total: 1,
    });

    await resourceController.searchResources(req, res, next);

    expect(resourceService.searchResources).toHaveBeenCalledWith('calculus', {
      type: 'document',
      limit: '1',
      skip: '0',
    });
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Search completed successfully',
      data: [{ _id: 'r1', title: 'Calculus Notes' }],
      total: 1,
    });
  });

  it('forwards service errors to next via async handler', async () => {
    const error = new Error('service failed');
    resourceService.getAllResources.mockRejectedValue(error);

    await resourceController.getAllResources(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
