import request from './request';

export const authApi = {
  login: (data: { username: string; password: string }) => request.post('/auth/login', data),
  getMe: () => request.get('/auth/me'),
  updateProfile: (data: any) => request.put('/auth/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) => request.post('/auth/change-password', data),
};

export const userApi = {
  list: (params?: any) => request.get('/users', { params }),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
  resetPassword: (id: number, data: { newPassword: string }) => request.put(`/users/${id}/reset-password`, data),
  unlock: (id: number) => request.put(`/users/${id}/unlock`),
  delete: (id: number) => request.delete(`/users/${id}`),
};

export const customerApi = {
  list: (params?: any) => request.get('/customers', { params }),
  get: (id: number) => request.get(`/customers/${id}`),
  create: (data: any) => request.post('/customers', data),
  update: (id: number, data: any) => request.put(`/customers/${id}`, data),
};

export const accountApi = {
  list: (params?: any) => request.get('/accounts', { params }),
  get: (id: number) => request.get(`/accounts/${id}`),
  create: (data: any) => request.post('/accounts', data),
  updateStatus: (id: number, data: { status: string }) => request.put(`/accounts/${id}/status`, data),
};

export const transactionApi = {
  list: (params?: any) => request.get('/transactions', { params }),
  get: (id: number) => request.get(`/transactions/${id}`),
  deposit: (data: any) => request.post('/transactions/deposit', data),
  withdraw: (data: any) => request.post('/transactions/withdraw', data),
  transfer: (data: any) => request.post('/transactions/transfer', data),
  review: (id: number, data: { action: string }) => request.put(`/transactions/${id}/review`, data),
};

export const loanApi = {
  list: (params?: any) => request.get('/loans', { params }),
  get: (id: number) => request.get(`/loans/${id}`),
  create: (data: any) => request.post('/loans', data),
  approve: (id: number) => request.put(`/loans/${id}/approve`),
  reject: (id: number, data?: { reason: string }) => request.put(`/loans/${id}/reject`, data),
  disburse: (id: number, data: { accountId: number }) => request.put(`/loans/${id}/disburse`, data),
  repay: (id: number, data: any) => request.post(`/loans/${id}/repay`, data),
};

export const dashboardApi = {
  getStats: () => request.get('/dashboard/stats'),
};

export const auditApi = {
  list: (params?: any) => request.get('/audit-logs', { params }),
};

export const notificationApi = {
  list: () => request.get('/notifications'),
  readAll: () => request.put('/notifications/read-all'),
  read: (id: number) => request.put(`/notifications/${id}/read`),
};

export const systemConfigApi = {
  list: () => request.get('/system-config'),
  update: (id: number, data: { value: string }) => request.put(`/system-config/${id}`, data),
};

export const reportApi = {
  transactionSummary: (params?: any) => request.get('/reports/transaction-summary', { params }),
  loanSummary: () => request.get('/reports/loan-summary'),
  customerSummary: () => request.get('/reports/customer-summary'),
  exportTransactions: (params?: any) =>
    request.get('/reports/export/transactions', { params, responseType: 'blob' }),
};
