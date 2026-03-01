import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
