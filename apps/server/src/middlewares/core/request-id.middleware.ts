import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.reqId = reqId as string;
  (global as any).currentReqId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
