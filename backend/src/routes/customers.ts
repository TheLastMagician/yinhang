import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error, paginate } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.keyword) {
      const kw = String(req.query.keyword);
      where.OR = [{ name: { contains: kw } }, { idNumber: { contains: kw } }, { phone: { contains: kw } }];
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.riskLevel) where.riskLevel = req.query.riskLevel;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { accounts: true, loans: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return paginate(res, customers, total, page, pageSize);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        accounts: {
          orderBy: { createdAt: 'desc' },
          include: {
            transactionsFrom: { orderBy: { createdAt: 'desc' }, take: 5 },
            transactionsTo: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        loans: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { repayments: true } } },
        },
      },
    });

    if (!customer) return error(res, '客户不存在', 1, 404);

    const totalBalance = customer.accounts
      .filter(a => a.status === 'ACTIVE')
      .reduce((sum, a) => sum + a.balance, 0);

    const totalLoan = customer.loans
      .filter(l => ['APPROVED', 'ACTIVE'].includes(l.status))
      .reduce((sum, l) => sum + l.amount, 0);

    return success(res, { ...customer, totalBalance, totalLoan });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, idType, idNumber, phone, email, address, gender, birthDate, occupation, riskLevel } = req.body;

    if (!name || !idType || !idNumber || !phone) return error(res, '请填写必填字段');

    const exists = await prisma.customer.findUnique({ where: { idNumber } });
    if (exists) return error(res, '该证件号已存在');

    const customer = await prisma.customer.create({
      data: {
        name, idType, idNumber, phone, email, address, gender, occupation,
        riskLevel: riskLevel || 'LOW',
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    });

    await createAuditLog({
      userId: req.user!.id, action: '新增客户', module: '客户管理',
      target: `${name}(${idNumber})`,
    });

    return success(res, customer, '客户创建成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { name, phone, email, address, gender, birthDate, status, occupation, riskLevel } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name, phone, email, address, gender, status, occupation, riskLevel,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    });

    await createAuditLog({
      userId: req.user!.id, action: '更新客户', module: '客户管理',
      target: `${customer.name}(${customer.idNumber})`,
    });

    return success(res, customer, '客户更新成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
