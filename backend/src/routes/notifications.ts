import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    return success(res, { notifications, unreadCount });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return success(res, null, '已全部标为已读');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return success(res, null);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
