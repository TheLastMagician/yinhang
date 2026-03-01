import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return error(res, '请输入用户名和密码');
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return error(res, '用户名或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      return error(res, '账号已被禁用');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return error(res, '用户名或密码错误');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    await createAuditLog({
      userId: user.id,
      action: '登录',
      module: '认证',
      ip: req.ip,
    });

    return success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, name: true, role: true, email: true, phone: true, status: true },
    });

    if (!user) {
      return error(res, '用户不存在', 1, 404);
    }

    return success(res, user);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return error(res, '用户不存在', 1, 404);

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return error(res, '原密码错误');

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    await createAuditLog({
      userId: req.user!.id,
      action: '修改密码',
      module: '认证',
      ip: req.ip,
    });

    return success(res, null, '密码修改成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
