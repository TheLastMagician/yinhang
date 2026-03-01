import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Tag } from 'antd';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import dayjs from 'dayjs';

export default function Profile() {
  const { user, setAuth } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    authApi.getMe().then((res: any) => {
      setProfile(res.data);
      profileForm.setFieldsValue(res.data);
    });
  }, []);

  const handleUpdateProfile = async () => {
    const values = await profileForm.validateFields();
    const res: any = await authApi.updateProfile(values);
    const token = localStorage.getItem('token');
    if (token) setAuth(token, { ...user!, ...res.data });
    message.success('个人资料已更新');
  };

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields();
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次密码不一致');
      return;
    }
    await authApi.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
    passwordForm.resetFields();
    message.success('密码修改成功');
  };

  const roleMap: Record<string, string> = { ADMIN: '管理员', MANAGER: '经理', TELLER: '柜员', AUDITOR: '审计' };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Card title="个人信息">
        {profile && (
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="用户名">{profile.username}</Descriptions.Item>
            <Descriptions.Item label="角色"><Tag color="blue">{roleMap[profile.role] || profile.role}</Tag></Descriptions.Item>
            <Descriptions.Item label="注册时间">{dayjs(profile.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="上次登录">{profile.lastLoginAt ? dayjs(profile.lastLoginAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          </Descriptions>
        )}

        <Form form={profileForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Button type="primary" onClick={handleUpdateProfile}>保存资料</Button>
        </Form>
      </Card>

      <Card title="修改密码" style={{ marginTop: 16 }}>
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" danger onClick={handleChangePassword}>修改密码</Button>
        </Form>
      </Card>
    </div>
  );
}
