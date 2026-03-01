import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { success, error, paginate } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateTransactionNo, getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.type) where.type = req.query.type;
    if (req.query.accountId) {
      const accId = parseInt(String(req.query.accountId));
      where.OR = [{ fromAccountId: accId }, { toAccountId: accId }];
    }
    if (req.query.transactionNo) where.transactionNo = { contains: req.query.transactionNo as string };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          fromAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
          toAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return paginate(res, transactions, total, page, pageSize);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/deposit', async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || !amount || amount <= 0) {
      return error(res, '请输入有效的存款金额');
    }

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return error(res, '账户不存在');
    if (account.status !== 'ACTIVE') return error(res, '账户状态异常');

    const transactionNo = generateTransactionNo();

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionNo,
          type: 'DEPOSIT',
          amount,
          toAccountId: accountId,
          description: description || '现金存款',
          status: 'COMPLETED',
          operatorId: req.user!.id,
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: amount } },
      }),
    ]);

    await createAuditLog({
      userId: req.user!.id,
      action: '存款',
      module: '交易管理',
      target: account.accountNumber,
      detail: `存款 ¥${amount.toFixed(2)}`,
    });

    return success(res, transaction, '存款成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || !amount || amount <= 0) {
      return error(res, '请输入有效的取款金额');
    }

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return error(res, '账户不存在');
    if (account.status !== 'ACTIVE') return error(res, '账户状态异常');
    if (account.balance < amount) return error(res, '余额不足');

    const transactionNo = generateTransactionNo();

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionNo,
          type: 'WITHDRAWAL',
          amount,
          fromAccountId: accountId,
          description: description || '现金取款',
          status: 'COMPLETED',
          operatorId: req.user!.id,
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { decrement: amount } },
      }),
    ]);

    await createAuditLog({
      userId: req.user!.id,
      action: '取款',
      module: '交易管理',
      target: account.accountNumber,
      detail: `取款 ¥${amount.toFixed(2)}`,
    });

    return success(res, transaction, '取款成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/transfer', async (req: AuthRequest, res: Response) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;

    if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
      return error(res, '请输入有效的转账信息');
    }

    if (fromAccountId === toAccountId) {
      return error(res, '不能转账给同一账户');
    }

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: fromAccountId } }),
      prisma.account.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!fromAccount) return error(res, '转出账户不存在');
    if (!toAccount) return error(res, '转入账户不存在');
    if (fromAccount.status !== 'ACTIVE') return error(res, '转出账户状态异常');
    if (toAccount.status !== 'ACTIVE') return error(res, '转入账户状态异常');
    if (fromAccount.balance < amount) return error(res, '余额不足');

    const transactionNo = generateTransactionNo();

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionNo,
          type: 'TRANSFER',
          amount,
          fromAccountId,
          toAccountId,
          description: description || '转账',
          status: 'COMPLETED',
          operatorId: req.user!.id,
        },
      }),
      prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      }),
      prisma.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      }),
    ]);

    await createAuditLog({
      userId: req.user!.id,
      action: '转账',
      module: '交易管理',
      target: `${fromAccount.accountNumber} -> ${toAccount.accountNumber}`,
      detail: `转账 ¥${amount.toFixed(2)}`,
    });

    return success(res, transaction, '转账成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
