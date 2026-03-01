import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { paginate, error } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getPaginationParams } from '../utils/helpers';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER', 'AUDITOR'));

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.module) where.module = req.query.module;
    if (req.query.action) where.action = { contains: String(req.query.action) };
    if (req.query.userId) where.userId = parseInt(String(req.query.userId));
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(String(req.query.startDate));
      if (req.query.endDate) where.createdAt.lte = new Date(String(req.query.endDate));
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, username: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return paginate(res, logs, total, page, pageSize);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
