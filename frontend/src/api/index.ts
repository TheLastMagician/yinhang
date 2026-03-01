import request from './request';

export const authApi = {
  login: (data: { username: string; password: string }) => request.post('/auth/login', data),
  getMe: () => request.get('/auth/me'),
  changePassword: (data: { oldPassword: string; newPassword: string }) => request.post('/auth/change-password', data),
};

export const userApi = {
  list: (params?: any) => request.get('/users', { params }),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
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
  deposit: (data: any) => request.post('/transactions/deposit', data),
  withdraw: (data: any) => request.post('/transactions/withdraw', data),
  transfer: (data: any) => request.post('/transactions/transfer', data),
};

export const loanApi = {
  list: (params?: any) => request.get('/loans', { params }),
  get: (id: number) => request.get(`/loans/${id}`),
  create: (data: any) => request.post('/loans', data),
  approve: (id: number) => request.put(`/loans/${id}/approve`),
  reject: (id: number) => request.put(`/loans/${id}/reject`),
};

export const dashboardApi = {
  getStats: () => request.get('/dashboard/stats'),
};

export const auditApi = {
  list: (params?: any) => request.get('/audit-logs', { params }),
};
