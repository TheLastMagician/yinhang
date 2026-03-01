import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { success, error, paginate } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateLoanNumber, getPaginationParams } from '../utils/helpers';
import { createAuditLog } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, pageSize, skip, take } = getPaginationParams(req.query);
    const where: any = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.customerId) where.customerId = parseInt(String(req.query.customerId));
    if (req.query.keyword) {
      const kw = req.query.keyword as string;
      where.OR = [
        { loanNumber: { contains: kw } },
        { customer: { name: { contains: kw } } },
      ];
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, idNumber: true } } },
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
    return success(res, loan);
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amount, interestRate, term, type, purpose } = req.body;

    if (!customerId || !amount || !interestRate || !term || !type) {
      return error(res, '请填写必填字段');
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return error(res, '客户不存在');
    if (customer.status !== 'ACTIVE') return error(res, '客户状态异常');

    const loanNumber = generateLoanNumber();

    const loan = await prisma.loan.create({
      data: { loanNumber, customerId, amount, interestRate, term, type, purpose },
      include: { customer: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: '贷款申请',
      module: '贷款管理',
      target: loanNumber,
      detail: `客户 ${customer.name} 申请${type}贷款 ¥${amount.toFixed(2)}`,
    });

    return success(res, loan, '贷款申请成功');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

router.put('/:id/approve', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const loan = await prisma.loan.findUnique({ where: { id } });

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
        data: {
          status: 'APPROVED',
          approvedBy: req.user!.id,
          approvedAt: new Date(),
          startDate,
          endDate,
        },
      }),
      prisma.loanRepayment.createMany({ data: repayments }),
    ]);

    await createAuditLog({
      userId: req.user!.id,
      action: '审批通过',
      module: '贷款管理',
      target: loan.loanNumber,
    });

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
    const loan = await prisma.loan.findUnique({ where: { id } });

    if (!loan) return error(res, '贷款不存在', 1, 404);
    if (loan.status !== 'PENDING') return error(res, '该贷款已处理');

    await prisma.loan.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: req.user!.id, approvedAt: new Date() },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: '审批拒绝',
      module: '贷款管理',
      target: loan.loanNumber,
    });

    return success(res, null, '贷款已拒绝');
  } catch (e: any) {
    return error(res, e.message, 1, 500);
  }
});

export default router;
