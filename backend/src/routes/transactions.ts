import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error, paginate } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateTransactionNo, getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';
import { createNotification } from '../services/notification';
import { getConfig } from '../services/systemConfig';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;
    if (req.query.accountId) {
      const accId = parseInt(String(req.query.accountId));
      where.OR = [{ fromAccountId: accId }, { toAccountId: accId }];
    }
    if (req.query.transactionNo) where.transactionNo = { contains: String(req.query.transactionNo) };
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(String(req.query.startDate));
      if (req.query.endDate) where.createdAt.lte = new Date(String(req.query.endDate));
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where, skip, take,
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

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const txn = await prisma.transaction.findUnique({
      where: { id },
      include: {
        fromAccount: { include: { customer: { select: { name: true, idNumber: true } } } },
        toAccount: { include: { customer: { select: { name: true, idNumber: true } } } },
      },
    });
    if (!txn) return error(res, '交易不存在', 1, 404);
    return success(res, txn);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/deposit', async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || !amount || amount <= 0) return error(res, '请输入有效的存款金额');

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return error(res, '账户不存在');
    if (account.status !== 'ACTIVE') return error(res, '账户状态异常');

    const largeAmountThreshold = parseFloat(await getConfig('large_transaction_amount', '50000'));
    const needsReview = amount >= largeAmountThreshold;
    const transactionNo = generateTransactionNo();
    const newBalance = account.balance + amount;

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionNo, type: 'DEPOSIT', amount,
          toAccountId: accountId, balanceAfter: newBalance,
          description: description || '现金存款',
          status: needsReview ? 'PENDING_REVIEW' : 'COMPLETED',
          channel: 'COUNTER', operatorId: req.user!.id,
        },
      }),
      ...(needsReview ? [] : [
        prisma.account.update({ where: { id: accountId }, data: { balance: { increment: amount } } }),
      ]),
    ]);

    if (needsReview) {
      const { notifyRole } = await import('../services/notification');
      await notifyRole('MANAGER', {
        title: '大额交易待审批',
        content: `存款 ¥${amount.toFixed(2)} 至账户 ${account.accountNumber}，需要审批`,
        type: 'WARNING',
        link: '/transactions',
      });
    }

    await createAuditLog({
      userId: req.user!.id, action: '存款', module: '交易管理',
      target: account.accountNumber, detail: `存款 ¥${amount.toFixed(2)}`,
    });

    return success(res, transaction, needsReview ? '大额存款已提交审批' : '存款成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || !amount || amount <= 0) return error(res, '请输入有效的取款金额');

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return error(res, '账户不存在');
    if (account.status !== 'ACTIVE') return error(res, '账户状态异常');
    if (account.balance < amount) return error(res, '余额不足');

    if (amount > account.dailyLimit) {
      return error(res, `单笔取款不能超过 ¥${account.dailyLimit.toLocaleString()}`);
    }

    const largeAmountThreshold = parseFloat(await getConfig('large_transaction_amount', '50000'));
    const needsReview = amount >= largeAmountThreshold;
    const transactionNo = generateTransactionNo();
    const newBalance = account.balance - amount;

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionNo, type: 'WITHDRAWAL', amount,
          fromAccountId: accountId, balanceAfter: newBalance,
          description: description || '现金取款',
          status: needsReview ? 'PENDING_REVIEW' : 'COMPLETED',
          channel: 'COUNTER', operatorId: req.user!.id,
        },
      }),
      ...(needsReview ? [] : [
        prisma.account.update({ where: { id: accountId }, data: { balance: { decrement: amount } } }),
      ]),
    ]);

    if (needsReview) {
      const { notifyRole } = await import('../services/notification');
      await notifyRole('MANAGER', {
        title: '大额交易待审批',
        content: `取款 ¥${amount.toFixed(2)} 自账户 ${account.accountNumber}，需要审批`,
        type: 'WARNING',
        link: '/transactions',
      });
    }

    await createAuditLog({
      userId: req.user!.id, action: '取款', module: '交易管理',
      target: account.accountNumber, detail: `取款 ¥${amount.toFixed(2)}`,
    });

    return success(res, transaction, needsReview ? '大额取款已提交审批' : '取款成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/transfer', async (req: AuthRequest, res: Response) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;

    if (!fromAccountId || !toAccountId || !amount || amount <= 0) return error(res, '请输入有效的转账信息');
    if (fromAccountId === toAccountId) return error(res, '不能转账给同一账户');

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: fromAccountId } }),
      prisma.account.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!fromAccount) return error(res, '转出账户不存在');
    if (!toAccount) return error(res, '转入账户不存在');
    if (fromAccount.status !== 'ACTIVE') return error(res, '转出账户状态异常');
    if (toAccount.status !== 'ACTIVE') return error(res, '转入账户状态异常');
    if (fromAccount.balance < amount) return error(res, '余额不足');

    if (amount > fromAccount.dailyLimit) {
      return error(res, `单笔转账不能超过 ¥${fromAccount.dailyLimit.toLocaleString()}`);
    }

    const transactionNo = generateTransactionNo();

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionNo, type: 'TRANSFER', amount,
          fromAccountId, toAccountId,
          balanceAfter: fromAccount.balance - amount,
          description: description || '转账',
          status: 'COMPLETED', channel: 'COUNTER', operatorId: req.user!.id,
        },
      }),
      prisma.account.update({ where: { id: fromAccountId }, data: { balance: { decrement: amount } } }),
      prisma.account.update({ where: { id: toAccountId }, data: { balance: { increment: amount } } }),
    ]);

    await createAuditLog({
      userId: req.user!.id, action: '转账', module: '交易管理',
      target: `${fromAccount.accountNumber} -> ${toAccount.accountNumber}`,
      detail: `转账 ¥${amount.toFixed(2)}`,
    });

    return success(res, transaction, '转账成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/review', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { action } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) return error(res, '无效操作');

    const txn = await prisma.transaction.findUnique({ where: { id } });
    if (!txn) return error(res, '交易不存在', 1, 404);
    if (txn.status !== 'PENDING_REVIEW') return error(res, '该交易不需要审批');

    if (action === 'APPROVE') {
      if (txn.type === 'DEPOSIT' && txn.toAccountId) {
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id },
            data: { status: 'COMPLETED', reviewedBy: req.user!.id, reviewedAt: new Date() },
          }),
          prisma.account.update({
            where: { id: txn.toAccountId },
            data: { balance: { increment: txn.amount } },
          }),
        ]);
      } else if (txn.type === 'WITHDRAWAL' && txn.fromAccountId) {
        const acc = await prisma.account.findUnique({ where: { id: txn.fromAccountId } });
        if (!acc || acc.balance < txn.amount) return error(res, '余额不足，无法审批');

        await prisma.$transaction([
          prisma.transaction.update({
            where: { id },
            data: { status: 'COMPLETED', reviewedBy: req.user!.id, reviewedAt: new Date() },
          }),
          prisma.account.update({
            where: { id: txn.fromAccountId },
            data: { balance: { decrement: txn.amount } },
          }),
        ]);
      }
    } else {
      await prisma.transaction.update({
        where: { id },
        data: { status: 'REJECTED', reviewedBy: req.user!.id, reviewedAt: new Date() },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: action === 'APPROVE' ? '审批通过交易' : '拒绝交易',
      module: '交易管理', target: txn.transactionNo,
    });

    return success(res, null, action === 'APPROVE' ? '交易已审批通过' : '交易已拒绝');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
