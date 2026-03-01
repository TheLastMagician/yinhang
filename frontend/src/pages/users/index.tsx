import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { userApi } from '@/api';
import dayjs from 'dayjs';

export default function Users() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await userApi.list(params);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingId) {
      const { password: _, username: __, ...rest } = values;
      await userApi.update(editingId, rest);
      message.success('更新成功');
    } else {
      await userApi.create(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    form.resetFields();
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await userApi.delete(id);
    message.success('删除成功');
    fetchData();
  };

  const roleMap: any = { ADMIN: { color: 'red', text: '管理员' }, MANAGER: { color: 'blue', text: '经理' }, TELLER: { color: 'green', text: '柜员' }, AUDITOR: { color: 'purple', text: '审计' } };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '角色', dataIndex: 'role', width: 100, render: (v: string) => <Tag color={roleMap[v]?.color}>{roleMap[v]?.text}</Tag> },
    { title: '邮箱', dataIndex: 'email', width: 180 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', width: 120, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => { setEditingId(record.id); form.setFieldsValue(record); setModalOpen(true); }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="用户管理"
      extra={
        <Space>
          <Input placeholder="搜索用户名/姓名" prefix={<SearchOutlined />} value={params.keyword}
            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })} style={{ width: 200 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>新增用户</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={data.list} rowKey="id" loading={loading} scroll={{ x: 1000 }}
        pagination={{ current: params.page, pageSize: params.pageSize, total: data.total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />

      <Modal title={editingId ? '编辑用户' : '新增用户'} open={modalOpen} onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }} width={500}>
        <Form form={form} layout="vertical">
          {!editingId && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={[{ value: 'ADMIN', label: '管理员' }, { value: 'MANAGER', label: '经理' }, { value: 'TELLER', label: '柜员' }, { value: 'AUDITOR', label: '审计' }]} />
          </Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'INACTIVE', label: '禁用' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
