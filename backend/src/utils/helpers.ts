export function generateAccountNumber(): string {
  const prefix = '6222';
  const middle = Date.now().toString().slice(-8);
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${middle}${suffix}`;
}

export function generateTransactionNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `TXN${date}${random}`;
}

export function generateLoanNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `LN${date}${random}`;
}

export function getPaginationParams(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page)) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize)) || 10));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}
