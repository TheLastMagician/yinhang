import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BankOutlined,
  TeamOutlined,
  TransactionOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotificationBell from '@/components/NotificationBell';
import Login from '@/pages/Login';
import Dashboard from '@/pages/dashboard';
import Customers from '@/pages/customers';
import CustomerDetail from '@/pages/customers/detail';
import Accounts from '@/pages/accounts';
import Transactions from '@/pages/transactions';
import Loans from '@/pages/loans';
import Users from '@/pages/users';
import AuditLogs from '@/pages/audit';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import Profile from '@/pages/profile';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  if (!user) return <Navigate to="/login" />;

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
    { key: '/accounts', icon: <BankOutlined />, label: '账户管理' },
    { key: '/transactions', icon: <TransactionOutlined />, label: '交易管理' },
    { key: '/loans', icon: <FileTextOutlined />, label: '贷款管理' },
    ...(['ADMIN', 'MANAGER'].includes(user.role)
      ? [{ key: '/users', icon: <UserOutlined />, label: '用户管理' }] : []),
    ...(['ADMIN', 'MANAGER', 'AUDITOR'].includes(user.role)
      ? [
        { key: '/reports', icon: <BarChartOutlined />, label: '报表中心' },
        { key: '/audit', icon: <AuditOutlined />, label: '审计日志' },
      ] : []),
    ...(['ADMIN'].includes(user.role)
      ? [{ key: '/settings', icon: <SettingOutlined />, label: '系统设置' }] : []),
  ];

  const roleMap: Record<string, string> = { ADMIN: '管理员', MANAGER: '经理', TELLER: '柜员', AUDITOR: '审计' };

  const selectedKey = '/' + (location.pathname.split('/')[1] || '');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} style={{ background: '#001529' }} breakpoint="lg" collapsedWidth={60}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <BankOutlined style={{ fontSize: 22, color: '#1677ff', marginRight: 6 }} />
          <Text strong style={{ color: 'white', fontSize: 15 }}>银行管理系统</Text>
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: 'white', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', gap: 20, height: 56 }}>
          <NotificationBell />
          <Space style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>
            <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#1677ff' }} />
            <span style={{ fontSize: 13 }}>{user.name}</span>
            <Text type="secondary" style={{ fontSize: 11 }}>({roleMap[user.role] || user.role})</Text>
          </Space>
          <LogoutOutlined style={{ cursor: 'pointer', color: '#999' }} onClick={() => { logout(); navigate('/login'); }} />
        </Header>
        <Content style={{ margin: 12, padding: 12, background: '#f5f5f5', borderRadius: 8, overflow: 'auto' }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/users" element={<Users />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
