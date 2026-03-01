import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      customerCount,
      accountCount,
      totalBalance,
      todayTransactions,
      pendingLoans,
      totalLoanAmount,
      recentTransactions,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.account.count({ where: { status: 'ACTIVE' } }),
      prisma.account.aggregate({ where: { status: 'ACTIVE' }, _sum: { balance: true } }),
      prisma.transaction.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.loan.count({ where: { status: 'PENDING' } }),
      prisma.loan.aggregate({ where: { status: { in: ['APPROVED', 'ACTIVE'] } }, _sum: { amount: true } }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          fromAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
          toAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
        },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, username: true } } },
      }),
    ]);

    const accountsByType = await prisma.account.groupBy({
      by: ['type'],
      where: { status: 'ACTIVE' },
      _count: true,
      _sum: { balance: true },
    });

    const loansByStatus = await prisma.loan.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
    });

    return success(res, {
      overview: {
        customerCount,
        accountCount,
        totalBalance: totalBalance._sum.balance || 0,
        todayTransactions,
        pendingLoans,
        totalLoanAmount: totalLoanAmount._sum.amount || 0,
      },
      accountsByType,
      loansByStatus,
      recentTransactions,
      recentAuditLogs,
    });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
