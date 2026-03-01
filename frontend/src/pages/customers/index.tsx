import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, Tag, Space, Modal, Form, Select, DatePicker, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { customerApi } from '@/api';
import dayjs from 'dayjs';

export default function Customers() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await customerApi.list(params);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (values.birthDate) values.birthDate = values.birthDate.toISOString();
    if (editingId) {
      await customerApi.update(editingId, values);
      message.success('更新成功');
    } else {
      await customerApi.create(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    form.resetFields();
    setEditingId(null);
    fetchData();
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      birthDate: record.birthDate ? dayjs(record.birthDate) : undefined,
    });
    setModalOpen(true);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    {
      title: '证件类型', dataIndex: 'idType', width: 100,
      render: (v: string) => v === 'ID_CARD' ? '身份证' : '护照',
    },
    { title: '证件号码', dataIndex: 'idNumber', width: 180 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    {
      title: '性别', dataIndex: 'gender', width: 60,
      render: (v: string) => v === 'MALE' ? '男' : v === 'FEMALE' ? '女' : '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => {
        const map: any = { ACTIVE: { color: 'green', text: '正常' }, INACTIVE: { color: 'default', text: '停用' }, BLACKLISTED: { color: 'red', text: '黑名单' } };
        return <Tag color={map[v]?.color}>{map[v]?.text}</Tag>;
      },
    },
    { title: '账户数', dataIndex: ['_count', 'accounts'], width: 80 },
    { title: '贷款数', dataIndex: ['_count', 'loans'], width: 80 },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', width: 80, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <Card
      title="客户管理"
      extra={
        <Space>
          <Input
            placeholder="搜索姓名/证件号/电话"
            prefix={<SearchOutlined />}
            value={params.keyword}
            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
            style={{ width: 240 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
            新增客户
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={data.list}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: params.page,
          pageSize: params.pageSize,
          total: data.total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }),
        }}
      />

      <Modal
        title={editingId ? '编辑客户' : '新增客户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editingId && (
            <>
              <Form.Item name="idType" label="证件类型" rules={[{ required: true }]}>
                <Select options={[{ value: 'ID_CARD', label: '身份证' }, { value: 'PASSPORT', label: '护照' }]} />
              </Form.Item>
              <Form.Item name="idNumber" label="证件号码" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item name="phone" label="电话" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select options={[{ value: 'MALE', label: '男' }, { value: 'FEMALE', label: '女' }]} allowClear />
          </Form.Item>
          <Form.Item name="birthDate" label="出生日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input.TextArea rows={2} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[{ value: 'ACTIVE', label: '正常' }, { value: 'INACTIVE', label: '停用' }, { value: 'BLACKLISTED', label: '黑名单' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
