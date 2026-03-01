import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER', 'AUDITOR'));

router.get('/transaction-summary', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(String(req.query.days)) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
      select: { type: true, amount: true, fee: true, createdAt: true },
    });

    const dailyData: Record<string, { date: string; deposit: number; withdrawal: number; transfer: number; count: number }> = {};

    transactions.forEach(t => {
      const date = t.createdAt.toISOString().slice(0, 10);
      if (!dailyData[date]) {
        dailyData[date] = { date, deposit: 0, withdrawal: 0, transfer: 0, count: 0 };
      }
      dailyData[date].count++;
      if (t.type === 'DEPOSIT') dailyData[date].deposit += t.amount;
      if (t.type === 'WITHDRAWAL') dailyData[date].withdrawal += t.amount;
      if (t.type === 'TRANSFER') dailyData[date].transfer += t.amount;
    });

    const summary = {
      totalDeposit: transactions.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0),
      totalWithdrawal: transactions.filter(t => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amount, 0),
      totalTransfer: transactions.filter(t => t.type === 'TRANSFER').reduce((s, t) => s + t.amount, 0),
      totalFees: transactions.reduce((s, t) => s + t.fee, 0),
      totalCount: transactions.length,
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
    };

    return success(res, summary);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/loan-summary', async (_req: AuthRequest, res: Response) => {
  try {
    const loansByStatus = await prisma.loan.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
    });

    const loansByType = await prisma.loan.groupBy({
      by: ['type'],
      _count: true,
      _sum: { amount: true },
    });

    const overdueRepayments = await prisma.loanRepayment.count({
      where: { status: 'OVERDUE' },
    });

    const totalRepaid = await prisma.loanRepayment.aggregate({
      where: { status: 'PAID' },
      _sum: { paidAmount: true },
    });

    const pendingRepayments = await prisma.loanRepayment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lte: new Date(Date.now() + 7 * 24 * 3600000) },
      },
      include: { loan: { include: { customer: { select: { name: true } } } } },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    return success(res, {
      loansByStatus,
      loansByType,
      overdueRepayments,
      totalRepaid: totalRepaid._sum.paidAmount || 0,
      upcomingRepayments: pendingRepayments,
    });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/customer-summary', async (_req: AuthRequest, res: Response) => {
  try {
    const customersByStatus = await prisma.customer.groupBy({
      by: ['status'],
      _count: true,
    });

    const accountsByType = await prisma.account.groupBy({
      by: ['type'],
      where: { status: 'ACTIVE' },
      _count: true,
      _sum: { balance: true },
    });

    const topCustomers = await prisma.account.groupBy({
      by: ['customerId'],
      where: { status: 'ACTIVE' },
      _sum: { balance: true },
      orderBy: { _sum: { balance: 'desc' } },
      take: 10,
    });

    const customerIds = topCustomers.map(c => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, idNumber: true },
    });

    const topCustomersWithNames = topCustomers.map(tc => ({
      ...tc,
      customer: customers.find(c => c.id === tc.customerId),
    }));

    return success(res, { customersByStatus, accountsByType, topCustomers: topCustomersWithNames });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/export/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { status: 'COMPLETED' };
    if (req.query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(String(req.query.startDate)) };
    if (req.query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(String(req.query.endDate)) };
    if (req.query.type) where.type = req.query.type;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        fromAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
        toAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
      },
    });

    const typeMap: Record<string, string> = { DEPOSIT: '存款', WITHDRAWAL: '取款', TRANSFER: '转账' };
    const header = '交易号,类型,金额,手续费,转出账户,转出客户,转入账户,转入客户,描述,状态,时间\n';
    const rows = transactions.map(t =>
      [
        t.transactionNo, typeMap[t.type] || t.type, t.amount.toFixed(2), t.fee.toFixed(2),
        t.fromAccount?.accountNumber || '', t.fromAccount?.customer?.name || '',
        t.toAccount?.accountNumber || '', t.toAccount?.customer?.name || '',
        `"${(t.description || '').replace(/"/g, '""')}"`, t.status,
        t.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      ].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + header + rows);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
