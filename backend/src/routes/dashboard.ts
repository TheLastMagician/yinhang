import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      customerCount, accountCount, totalBalance,
      todayTransactions, todayAmount,
      pendingLoans, totalLoanAmount,
      overdueRepayments, pendingReviewTxns,
      recentTransactions, recentAuditLogs,
    ] = await Promise.all([
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.account.count({ where: { status: 'ACTIVE' } }),
      prisma.account.aggregate({ where: { status: 'ACTIVE' }, _sum: { balance: true } }),
      prisma.transaction.count({ where: { createdAt: { gte: today }, status: 'COMPLETED' } }),
      prisma.transaction.aggregate({ where: { createdAt: { gte: today }, status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.loan.count({ where: { status: 'PENDING' } }),
      prisma.loan.aggregate({ where: { status: { in: ['APPROVED', 'ACTIVE'] } }, _sum: { amount: true } }),
      prisma.loanRepayment.count({ where: { status: 'OVERDUE' } }),
      prisma.transaction.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.transaction.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: {
          fromAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
          toAccount: { select: { accountNumber: true, customer: { select: { name: true } } } },
        },
      }),
      prisma.auditLog.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, username: true } } },
      }),
    ]);

    const accountsByType = await prisma.account.groupBy({
      by: ['type'], where: { status: 'ACTIVE' },
      _count: true, _sum: { balance: true },
    });

    const loansByStatus = await prisma.loan.groupBy({
      by: ['status'], _count: true, _sum: { amount: true },
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const txnCount = await prisma.transaction.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' },
      });
      const txnAmount = await prisma.transaction.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, status: 'COMPLETED' },
        _sum: { amount: true },
      });

      last7Days.push({
        date: dayStart.toISOString().slice(5, 10),
        count: txnCount,
        amount: txnAmount._sum.amount || 0,
      });
    }

    return success(res, {
      overview: {
        customerCount, accountCount,
        totalBalance: totalBalance._sum.balance || 0,
        todayTransactions,
        todayAmount: todayAmount._sum.amount || 0,
        pendingLoans, overdueRepayments, pendingReviewTxns,
        totalLoanAmount: totalLoanAmount._sum.amount || 0,
      },
      accountsByType, loansByStatus, last7Days,
      recentTransactions, recentAuditLogs,
    });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
