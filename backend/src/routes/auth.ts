import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { config } from '../config';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../services/audit';
import { createNotification } from '../services/notification';

const router = Router();

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MINUTES = 30;

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

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return error(res, `账号已锁定，请${remaining}分钟后再试`);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const failedLogins = user.failedLogins + 1;
      const updateData: any = { failedLogins };

      if (failedLogins >= MAX_FAILED_LOGINS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
        updateData.lockedUntil = lockedUntil;
        updateData.failedLogins = 0;
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      const remaining = MAX_FAILED_LOGINS - failedLogins;
      if (remaining > 0) {
        return error(res, `用户名或密码错误，还有${remaining}次机会`);
      } else {
        return error(res, `连续登录失败过多，账号已锁定${LOCK_DURATION_MINUTES}分钟`);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

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
      select: {
        id: true, username: true, name: true, role: true, email: true, phone: true,
        status: true, lastLoginAt: true, createdAt: true,
      },
    });

    if (!user) return error(res, '用户不存在', 1, 404);
    return success(res, user);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, email, phone },
      select: { id: true, username: true, name: true, role: true, email: true, phone: true },
    });
    await createAuditLog({ userId: req.user!.id, action: '修改个人资料', module: '认证' });
    return success(res, user, '个人资料更新成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return error(res, '新密码至少6个字符');
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return error(res, '用户不存在', 1, 404);

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return error(res, '原密码错误');

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    await createAuditLog({ userId: req.user!.id, action: '修改密码', module: '认证', ip: req.ip });
    await createNotification({
      userId: req.user!.id,
      title: '密码已修改',
      content: '您的密码已成功修改，如非本人操作请立即联系管理员。',
      type: 'WARNING',
    });

    return success(res, null, '密码修改成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
