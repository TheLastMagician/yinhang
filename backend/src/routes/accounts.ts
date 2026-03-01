import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { success, error, paginate } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateAccountNumber, getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.keyword) {
      const kw = req.query.keyword as string;
      where.OR = [
        { accountNumber: { contains: kw } },
        { customer: { name: { contains: kw } } },
      ];
    }
    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;
    if (req.query.customerId) where.customerId = parseInt(String(req.query.customerId));

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, idNumber: true } } },
      }),
      prisma.account.count({ where }),
    ]);

    return paginate(res, accounts, total, page, pageSize);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        customer: true,
        transactionsFrom: { orderBy: { createdAt: 'desc' }, take: 20 },
        transactionsTo: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!account) return error(res, '账户不存在', 1, 404);
    return success(res, account);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, type, currency } = req.body;

    if (!customerId || !type) {
      return error(res, '请填写必填字段');
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return error(res, '客户不存在');
    if (customer.status !== 'ACTIVE') return error(res, '客户状态异常，无法开户');

    const accountNumber = generateAccountNumber();

    const account = await prisma.account.create({
      data: { accountNumber, customerId, type, currency: currency || 'CNY' },
      include: { customer: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: '开户',
      module: '账户管理',
      target: accountNumber,
      detail: `为客户 ${customer.name} 开设${type}账户`,
    });

    return success(res, account, '开户成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/status', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status } = req.body;

    if (!['ACTIVE', 'FROZEN', 'CLOSED'].includes(status)) {
      return error(res, '无效的状态');
    }

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) return error(res, '账户不存在', 1, 404);

    if (status === 'CLOSED' && account.balance > 0) {
      return error(res, '账户余额不为零，无法销户');
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        status,
        closeDate: status === 'CLOSED' ? new Date() : null,
      },
    });

    const actionMap: Record<string, string> = { ACTIVE: '解冻账户', FROZEN: '冻结账户', CLOSED: '销户' };

    await createAuditLog({
      userId: req.user!.id,
      action: actionMap[status] || '变更状态',
      module: '账户管理',
      target: account.accountNumber,
    });

    return success(res, updated, '操作成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
