import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error, paginate } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateLoanNumber, getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';
import { createNotification, notifyRole } from '../services/notification';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.customerId) where.customerId = parseInt(String(req.query.customerId));
    if (req.query.keyword) {
      const kw = String(req.query.keyword);
      where.OR = [{ loanNumber: { contains: kw } }, { customer: { name: { contains: kw } } }];
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, idNumber: true } },
          _count: { select: { repayments: true } },
        },
      }),
      prisma.loan.count({ where }),
    ]);

    return paginate(res, loans, total, page, pageSize);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        repayments: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!loan) return error(res, '贷款不存在', 1, 404);

    const paidCount = loan.repayments.filter(r => r.status === 'PAID').length;
    const overdueCount = loan.repayments.filter(r => r.status === 'OVERDUE').length;
    const totalRepaid = loan.repayments.filter(r => r.status === 'PAID').reduce((s, r) => s + r.paidAmount, 0);

    return success(res, { ...loan, paidCount, overdueCount, totalRepaid });
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amount, interestRate, term, type, purpose, guarantor, collateral } = req.body;

    if (!customerId || !amount || !interestRate || !term || !type) return error(res, '请填写必填字段');
    if (amount < 1000) return error(res, '贷款金额不能低于1000元');

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return error(res, '客户不存在');
    if (customer.status !== 'ACTIVE') return error(res, '客户状态异常');

    const existingActiveLoans = await prisma.loan.count({
      where: { customerId, status: { in: ['APPROVED', 'ACTIVE'] } },
    });
    if (existingActiveLoans >= 3) return error(res, '该客户活跃贷款数量已达上限');

    const loanNumber = generateLoanNumber();

    const loan = await prisma.loan.create({
      data: { loanNumber, customerId, amount, interestRate, term, type, purpose, guarantor, collateral },
      include: { customer: { select: { id: true, name: true } } },
    });

    await notifyRole('MANAGER', {
      title: '新贷款申请待审批',
      content: `客户 ${customer.name} 申请${type === 'PERSONAL' ? '个人' : type === 'MORTGAGE' ? '房屋' : '经营'}贷款 ¥${amount.toLocaleString()}`,
      type: 'INFO', link: '/loans',
    });

    await createAuditLog({
      userId: req.user!.id, action: '贷款申请', module: '贷款管理',
      target: loanNumber, detail: `客户 ${customer.name} 申请${type}贷款 ¥${amount.toFixed(2)}`,
    });

    return success(res, loan, '贷款申请成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/approve', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const loan = await prisma.loan.findUnique({ where: { id }, include: { customer: true } });

    if (!loan) return error(res, '贷款不存在', 1, 404);
    if (loan.status !== 'PENDING') return error(res, '该贷款已处理');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + loan.term);

    const monthlyRate = loan.interestRate / 100 / 12;
    const monthlyPayment = (loan.amount * monthlyRate * Math.pow(1 + monthlyRate, loan.term)) /
      (Math.pow(1 + monthlyRate, loan.term) - 1);

    const repayments = [];
    let remainingPrincipal = loan.amount;

    for (let i = 1; i <= loan.term; i++) {
      const interest = remainingPrincipal * monthlyRate;
      const principal = monthlyPayment - interest;
      remainingPrincipal -= principal;

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      repayments.push({
        loanId: id,
        period: i,
        amount: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        dueDate,
        status: 'PENDING',
      });
    }

    await prisma.$transaction([
      prisma.loan.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: req.user!.id, approvedAt: new Date(), startDate, endDate },
      }),
      prisma.loanRepayment.createMany({ data: repayments }),
    ]);

    await createAuditLog({ userId: req.user!.id, action: '审批通过', module: '贷款管理', target: loan.loanNumber });

    const updated = await prisma.loan.findUnique({
      where: { id },
      include: { customer: true, repayments: { orderBy: { dueDate: 'asc' } } },
    });

    return success(res, updated, '贷款审批通过');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/reject', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { reason } = req.body;
    const loan = await prisma.loan.findUnique({ where: { id } });

    if (!loan) return error(res, '贷款不存在', 1, 404);
    if (loan.status !== 'PENDING') return error(res, '该贷款已处理');

    await prisma.loan.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: req.user!.id, approvedAt: new Date() },
    });

    await createAuditLog({
      userId: req.user!.id, action: '审批拒绝', module: '贷款管理',
      target: loan.loanNumber, detail: reason || undefined,
    });

    return success(res, null, '贷款已拒绝');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/disburse', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const { accountId } = req.body;

    const loan = await prisma.loan.findUnique({ where: { id }, include: { customer: true } });
    if (!loan) return error(res, '贷款不存在', 1, 404);
    if (loan.status !== 'APPROVED') return error(res, '该贷款未审批通过或已放款');

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return error(res, '目标账户不存在');
    if (account.customerId !== loan.customerId) return error(res, '目标账户不属于该贷款客户');
    if (account.status !== 'ACTIVE') return error(res, '目标账户状态异常');

    const { generateTransactionNo } = await import('../utils/helpers');
    const transactionNo = generateTransactionNo();

    await prisma.$transaction([
      prisma.loan.update({ where: { id }, data: { status: 'ACTIVE', disbursedAmount: loan.amount } }),
      prisma.account.update({ where: { id: accountId }, data: { balance: { increment: loan.amount } } }),
      prisma.transaction.create({
        data: {
          transactionNo, type: 'DEPOSIT', amount: loan.amount,
          toAccountId: accountId, balanceAfter: account.balance + loan.amount,
          description: `贷款放款 ${loan.loanNumber}`,
          status: 'COMPLETED', channel: 'SYSTEM', operatorId: req.user!.id,
        },
      }),
    ]);

    await createAuditLog({
      userId: req.user!.id, action: '放款', module: '贷款管理',
      target: loan.loanNumber, detail: `放款 ¥${loan.amount.toFixed(2)} 至账户 ${account.accountNumber}`,
    });

    return success(res, null, '放款成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/:id/repay', async (req: AuthRequest, res: Response) => {
  try {
    const loanId = parseInt(String(req.params.id));
    const { repaymentId, accountId, amount } = req.body;

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) return error(res, '贷款不存在', 1, 404);
    if (!['ACTIVE', 'APPROVED'].includes(loan.status)) return error(res, '该贷款状态不支持还款');

    const repayment = await prisma.loanRepayment.findUnique({ where: { id: repaymentId } });
    if (!repayment) return error(res, '还款记录不存在');
    if (repayment.loanId !== loanId) return error(res, '还款记录不属于该贷款');
    if (repayment.status === 'PAID') return error(res, '该期已还款');

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return error(res, '扣款账户不存在');
    if (account.status !== 'ACTIVE') return error(res, '扣款账户状态异常');

    const payAmount = amount || repayment.amount + repayment.penalty;
    if (account.balance < payAmount) return error(res, '账户余额不足');

    const { generateTransactionNo } = await import('../utils/helpers');
    const transactionNo = generateTransactionNo();

    await prisma.$transaction([
      prisma.loanRepayment.update({
        where: { id: repaymentId },
        data: { status: 'PAID', paidDate: new Date(), paidAmount: payAmount },
      }),
      prisma.loan.update({
        where: { id: loanId },
        data: { repaidAmount: { increment: payAmount } },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { balance: { decrement: payAmount } },
      }),
      prisma.transaction.create({
        data: {
          transactionNo, type: 'WITHDRAWAL', amount: payAmount,
          fromAccountId: accountId, balanceAfter: account.balance - payAmount,
          description: `贷款还款 ${loan.loanNumber} 第${repayment.period}期`,
          status: 'COMPLETED', channel: 'SYSTEM', operatorId: req.user!.id,
        },
      }),
    ]);

    const allRepayments = await prisma.loanRepayment.findMany({ where: { loanId } });
    const allPaid = allRepayments.every(r => r.status === 'PAID' || r.id === repaymentId);
    if (allPaid) {
      await prisma.loan.update({ where: { id: loanId }, data: { status: 'COMPLETED' } });
    }

    await createAuditLog({
      userId: req.user!.id, action: '贷款还款', module: '贷款管理',
      target: loan.loanNumber, detail: `第${repayment.period}期还款 ¥${payAmount.toFixed(2)}`,
    });

    return success(res, null, '还款成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
