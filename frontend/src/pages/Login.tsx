import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form] = Form.useForm();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const res: any = await authApi.login(values);
      setAuth(res.data.token, res.data.user);
      message.success(`欢迎回来，${res.data.user.name}`);
      navigate('/');
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BankOutlined style={{ fontSize: 48, color: '#1677ff' }} />
        </div>
        <h1 className="login-title">银行内部管理系统</h1>
        <p className="login-subtitle">Bank Internal Management System</p>
        <Form form={form} onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>
          管理员: admin / admin123 | 其他: manager / 123456
        </div>
      </div>
    </div>
  );
}
