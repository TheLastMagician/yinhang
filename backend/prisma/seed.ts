import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('123456', 10);

  const users = [
    { username: 'admin', password: adminPassword, name: '系统管理员', role: 'ADMIN', email: 'admin@bank.com', phone: '13800000001' },
    { username: 'manager', password: userPassword, name: '张经理', role: 'MANAGER', email: 'manager@bank.com', phone: '13800000002' },
    { username: 'teller01', password: userPassword, name: '李柜员', role: 'TELLER', email: 'teller01@bank.com', phone: '13800000003' },
    { username: 'teller02', password: userPassword, name: '王柜员', role: 'TELLER', email: 'teller02@bank.com', phone: '13800000004' },
    { username: 'auditor', password: userPassword, name: '赵审计', role: 'AUDITOR', email: 'auditor@bank.com', phone: '13800000005' },
  ];

  for (const u of users) {
    await prisma.user.upsert({ where: { username: u.username }, update: {}, create: u });
  }

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { idNumber: '110101199001011234' },
      update: {},
      create: { name: '刘伟', idType: 'ID_CARD', idNumber: '110101199001011234', phone: '13900001001', email: 'liuwei@example.com', address: '北京市朝阳区建国路88号', gender: 'MALE', birthDate: new Date('1990-01-01'), occupation: '软件工程师', riskLevel: 'LOW' },
    }),
    prisma.customer.upsert({
      where: { idNumber: '310101198505152345' },
      update: {},
      create: { name: '陈静', idType: 'ID_CARD', idNumber: '310101198505152345', phone: '13900001002', email: 'chenjing@example.com', address: '上海市浦东新区陆家嘴环路100号', gender: 'FEMALE', birthDate: new Date('1985-05-15'), occupation: '金融分析师', riskLevel: 'LOW' },
    }),
    prisma.customer.upsert({
      where: { idNumber: '440101199203203456' },
      update: {},
      create: { name: '黄明', idType: 'ID_CARD', idNumber: '440101199203203456', phone: '13900001003', email: 'huangming@example.com', address: '广州市天河区天河路385号', gender: 'MALE', birthDate: new Date('1992-03-20'), occupation: '个体经营者', riskLevel: 'MEDIUM' },
    }),
    prisma.customer.upsert({
      where: { idNumber: '510101198812124567' },
      update: {},
      create: { name: '杨丽', idType: 'ID_CARD', idNumber: '510101198812124567', phone: '13900001004', address: '成都市高新区天府大道999号', gender: 'FEMALE', birthDate: new Date('1988-12-12'), occupation: '教师', riskLevel: 'LOW' },
    }),
    prisma.customer.upsert({
      where: { idNumber: 'E12345678' },
      update: {},
      create: { name: 'David Smith', idType: 'PASSPORT', idNumber: 'E12345678', phone: '13900001005', email: 'david@example.com', address: '北京市海淀区中关村大街1号', gender: 'MALE', birthDate: new Date('1975-08-25'), occupation: '企业顾问', riskLevel: 'MEDIUM' },
    }),
  ]);

  const accounts = await Promise.all([
    prisma.account.upsert({ where: { accountNumber: '6222021001000001' }, update: {}, create: { accountNumber: '6222021001000001', customerId: customers[0].id, type: 'SAVINGS', balance: 150000.00, interestRate: 1.75, dailyLimit: 50000 } }),
    prisma.account.upsert({ where: { accountNumber: '6222021001000002' }, update: {}, create: { accountNumber: '6222021001000002', customerId: customers[0].id, type: 'CHECKING', balance: 35000.00, interestRate: 0.3, dailyLimit: 100000 } }),
    prisma.account.upsert({ where: { accountNumber: '6222021001000003' }, update: {}, create: { accountNumber: '6222021001000003', customerId: customers[1].id, type: 'SAVINGS', balance: 280000.00, interestRate: 1.75, dailyLimit: 50000 } }),
    prisma.account.upsert({ where: { accountNumber: '6222021001000004' }, update: {}, create: { accountNumber: '6222021001000004', customerId: customers[2].id, type: 'CHECKING', balance: 12500.00, interestRate: 0.3, dailyLimit: 100000 } }),
    prisma.account.upsert({ where: { accountNumber: '6222021001000005' }, update: {}, create: { accountNumber: '6222021001000005', customerId: customers[3].id, type: 'FIXED_DEPOSIT', balance: 500000.00, interestRate: 2.75, dailyLimit: 200000 } }),
    prisma.account.upsert({ where: { accountNumber: '6222021001000006' }, update: {}, create: { accountNumber: '6222021001000006', customerId: customers[4].id, type: 'SAVINGS', balance: 75000.00, interestRate: 1.75, dailyLimit: 50000 } }),
  ]);

  const txnBase = [
    { transactionNo: 'TXN20240101000001', type: 'DEPOSIT', amount: 100000, toAccountId: accounts[0].id, balanceAfter: 100000, description: '首次存款', status: 'COMPLETED', operatorId: 3, channel: 'COUNTER' },
    { transactionNo: 'TXN20240102000001', type: 'DEPOSIT', amount: 50000, toAccountId: accounts[0].id, balanceAfter: 150000, description: '工资入账', status: 'COMPLETED', operatorId: 3, channel: 'COUNTER' },
    { transactionNo: 'TXN20240103000001', type: 'TRANSFER', amount: 20000, fromAccountId: accounts[0].id, toAccountId: accounts[1].id, balanceAfter: 130000, description: '转活期', status: 'COMPLETED', operatorId: 3, channel: 'COUNTER' },
    { transactionNo: 'TXN20240104000001', type: 'WITHDRAWAL', amount: 5000, fromAccountId: accounts[1].id, balanceAfter: 30000, description: '现金取款', status: 'COMPLETED', operatorId: 4, channel: 'COUNTER' },
    { transactionNo: 'TXN20240105000001', type: 'DEPOSIT', amount: 280000, toAccountId: accounts[2].id, balanceAfter: 280000, description: '理财到期', status: 'COMPLETED', operatorId: 3, channel: 'COUNTER' },
    { transactionNo: 'TXN20240106000001', type: 'TRANSFER', amount: 10000, fromAccountId: accounts[2].id, toAccountId: accounts[3].id, balanceAfter: 270000, description: '跨行转账', status: 'COMPLETED', operatorId: 4, channel: 'COUNTER' },
  ];

  for (const txn of txnBase) {
    await prisma.transaction.upsert({ where: { transactionNo: txn.transactionNo }, update: {}, create: txn });
  }

  const loanData = [
    { loanNumber: 'LN20240101000001', customerId: customers[0].id, amount: 300000, interestRate: 4.35, term: 36, type: 'PERSONAL', status: 'PENDING', purpose: '装修贷款', guarantor: '王强' },
    { loanNumber: 'LN20240102000001', customerId: customers[1].id, amount: 1500000, interestRate: 3.85, term: 240, type: 'MORTGAGE', status: 'PENDING', purpose: '购房贷款', collateral: '上海市浦东新区XX路XX号房产' },
    { loanNumber: 'LN20240103000001', customerId: customers[2].id, amount: 50000, interestRate: 5.60, term: 12, type: 'BUSINESS', status: 'PENDING', purpose: '小微企业经营周转', guarantor: '赵磊' },
  ];

  for (const loan of loanData) {
    await prisma.loan.upsert({ where: { loanNumber: loan.loanNumber }, update: {}, create: loan });
  }

  const systemConfigs = [
    { key: 'bank_name', value: '银行内部管理系统', label: '银行名称', category: '基本设置' },
    { key: 'large_transaction_amount', value: '50000', label: '大额交易阈值(元)', category: '交易设置' },
    { key: 'max_daily_transfer', value: '500000', label: '每日转账上限(元)', category: '交易设置' },
    { key: 'transfer_fee_rate', value: '0.001', label: '转账手续费率', category: '交易设置' },
    { key: 'savings_interest_rate', value: '1.75', label: '储蓄年利率(%)', category: '利率设置' },
    { key: 'checking_interest_rate', value: '0.30', label: '活期年利率(%)', category: '利率设置' },
    { key: 'fixed_deposit_rate_1y', value: '2.75', label: '一年定期利率(%)', category: '利率设置' },
    { key: 'personal_loan_rate', value: '4.35', label: '个人贷款利率(%)', category: '利率设置' },
    { key: 'mortgage_rate', value: '3.85', label: '房贷利率(%)', category: '利率设置' },
    { key: 'business_loan_rate', value: '5.60', label: '经营贷利率(%)', category: '利率设置' },
    { key: 'max_loan_count', value: '3', label: '每人最大贷款数', category: '贷款设置' },
    { key: 'min_loan_amount', value: '1000', label: '最低贷款金额(元)', category: '贷款设置' },
    { key: 'password_min_length', value: '6', label: '密码最短长度', category: '安全设置' },
    { key: 'login_lock_threshold', value: '5', label: '登录锁定阈值(次)', category: '安全设置' },
    { key: 'login_lock_duration', value: '30', label: '锁定时长(分钟)', category: '安全设置' },
  ];

  for (const cfg of systemConfigs) {
    await prisma.systemConfig.upsert({ where: { key: cfg.key }, update: {}, create: cfg });
  }

  console.log('数据初始化完成！');
  console.log('默认管理员账号: admin / admin123');
  console.log('其他账号密码: 123456');
}

main()
  .catch((e) => { console.error('初始化失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
