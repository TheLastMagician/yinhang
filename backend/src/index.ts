import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import loanRoutes from './routes/loans';
import dashboardRoutes from './routes/dashboard';
import auditLogRoutes from './routes/auditLogs';
import notificationRoutes from './routes/notifications';
import systemConfigRoutes from './routes/systemConfig';
import reportRoutes from './routes/reports';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`银行内部系统后端已启动: http://localhost:${config.port}`);
});

export default app;
