import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../services/audit';
import { clearConfigCache } from '../services/systemConfig';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany({ orderBy: { category: 'asc' } });
    return success(res, configs);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { value } = req.body;

    const config = await prisma.systemConfig.update({ where: { id }, data: { value: String(value) } });
    clearConfigCache();

    await createAuditLog({
      userId: req.user!.id, action: '修改系统配置', module: '系统设置',
      target: config.key, detail: `设置 ${config.label} 为 ${value}`,
    });

    return success(res, config, '配置更新成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
