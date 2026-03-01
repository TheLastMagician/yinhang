import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { paginate, error } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getPaginationParams } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER', 'AUDITOR'));

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.module) where.module = req.query.module;
    if (req.query.action) where.action = { contains: req.query.action as string };
    if (req.query.userId) where.userId = parseInt(String(req.query.userId));

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
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
