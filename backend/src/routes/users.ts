import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { success, error, paginate } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.keyword) {
      const kw = req.query.keyword as string;
      where.OR = [
        { username: { contains: kw } },
        { name: { contains: kw } },
      ];
    }
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, name: true, role: true, email: true, phone: true, status: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    return paginate(res, users, total, page, pageSize);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, role, email, phone } = req.body;

    if (!username || !password || !name || !role) {
      return error(res, '请填写必填字段');
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return error(res, '用户名已存在');

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, name, role, email, phone },
      select: { id: true, username: true, name: true, role: true, email: true, phone: true, status: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: '创建用户',
      module: '用户管理',
      target: username,
      detail: `创建用户 ${name}(${username})，角色：${role}`,
    });

    return success(res, user, '用户创建成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { name, role, email, phone, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { name, role, email, phone, status },
      select: { id: true, username: true, name: true, role: true, email: true, phone: true, status: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: '更新用户',
      module: '用户管理',
      target: user.username,
    });

    return success(res, user, '用户更新成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));

    if (id === req.user!.id) {
      return error(res, '不能删除自己');
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: req.user!.id,
      action: '删除用户',
      module: '用户管理',
      target: `ID:${id}`,
    });

    return success(res, null, '用户删除成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
