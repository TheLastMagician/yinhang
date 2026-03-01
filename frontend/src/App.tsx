import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BankOutlined,
  TeamOutlined,
  TransactionOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import Login from '@/pages/Login';
import Dashboard from '@/pages/dashboard';
import Customers from '@/pages/customers';
import Accounts from '@/pages/accounts';
import Transactions from '@/pages/transactions';
import Loans from '@/pages/loans';
import Users from '@/pages/users';
import AuditLogs from '@/pages/audit';

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
    ...((['ADMIN', 'MANAGER'].includes(user.role))
      ? [{ key: '/users', icon: <UserOutlined />, label: '用户管理' }]
      : []),
    ...((['ADMIN', 'MANAGER', 'AUDITOR'].includes(user.role))
      ? [{ key: '/audit', icon: <AuditOutlined />, label: '审计日志' }]
      : []),
  ];

  const roleMap: Record<string, string> = { ADMIN: '管理员', MANAGER: '经理', TELLER: '柜员', AUDITOR: '审计' };

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        style={{ background: '#001529' }}
        breakpoint="lg"
        collapsedWidth={80}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <BankOutlined style={{ fontSize: 24, color: '#1677ff', marginRight: 8 }} />
          <Text strong style={{ color: 'white', fontSize: 16 }}>银行管理系统</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: 'white', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } } }}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span>{user.name}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>({roleMap[user.role] || user.role})</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 16, background: '#f5f5f5', borderRadius: 8, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
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
