import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { error } from '../utils/response';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    name: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return error(res, '未登录，请先登录', 401, 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch {
    return error(res, '登录已过期，请重新登录', 401, 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, '未登录', 401, 401);
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return error(res, '权限不足', 403, 403);
    }
    next();
  };
}
