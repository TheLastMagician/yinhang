import prisma from '../utils/prisma';

export async function createAuditLog(params: {
  userId?: number;
  action: string;
  module: string;
  target?: string;
  detail?: string;
  ip?: string;
}) {
  return prisma.auditLog.create({ data: params });
}
