import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, Tag, Space, Modal, Form, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { accountApi, customerApi } from '@/api';
import dayjs from 'dayjs';

export default function Accounts() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', type: '', status: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
      const res: any = await accountApi.list(cleanParams);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadCustomers = async () => {
    const res: any = await customerApi.list({ pageSize: 1000 });
    setCustomers(res.data.list);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    await accountApi.create(values);
    message.success('开户成功');
    setModalOpen(false);
    form.resetFields();
    fetchData();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await accountApi.updateStatus(id, { status });
    message.success('操作成功');
    fetchData();
  };

  const typeMap: any = { SAVINGS: '储蓄账户', CHECKING: '活期账户', FIXED_DEPOSIT: '定期存款' };
  const statusMap: any = { ACTIVE: { color: 'green', text: '正常' }, FROZEN: { color: 'orange', text: '冻结' }, CLOSED: { color: 'red', text: '已销户' } };

  const columns = [
    { title: '账号', dataIndex: 'accountNumber', width: 180 },
    { title: '客户', dataIndex: ['customer', 'name'], width: 100 },
    { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => typeMap[v] || v },
    {
      title: '余额', dataIndex: 'balance', width: 140,
      render: (v: number) => <span style={{ fontWeight: 600 }}>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>,
    },
    { title: '币种', dataIndex: 'currency', width: 60 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>,
    },
    {
      title: '开户时间', dataIndex: 'openDate', width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', width: 160, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {record.status === 'ACTIVE' && (
            <Popconfirm title="确定冻结该账户？" onConfirm={() => handleStatusChange(record.id, 'FROZEN')}>
              <Button type="link" size="small" danger>冻结</Button>
            </Popconfirm>
          )}
          {record.status === 'FROZEN' && (
            <Popconfirm title="确定解冻该账户？" onConfirm={() => handleStatusChange(record.id, 'ACTIVE')}>
              <Button type="link" size="small">解冻</Button>
            </Popconfirm>
          )}
          {record.status !== 'CLOSED' && record.balance === 0 && (
            <Popconfirm title="确定销户？此操作不可逆！" onConfirm={() => handleStatusChange(record.id, 'CLOSED')}>
              <Button type="link" size="small" danger>销户</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="账户管理"
      extra={
        <Space>
          <Input placeholder="搜索账号/客户名" prefix={<SearchOutlined />} value={params.keyword}
            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })} style={{ width: 200 }} allowClear />
          <Select placeholder="账户类型" value={params.type || undefined} onChange={(v) => setParams({ ...params, type: v || '', page: 1 })}
            allowClear style={{ width: 120 }} options={[{ value: 'SAVINGS', label: '储蓄' }, { value: 'CHECKING', label: '活期' }, { value: 'FIXED_DEPOSIT', label: '定期' }]} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { loadCustomers(); form.resetFields(); setModalOpen(true); }}>开户</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={data.list} rowKey="id" loading={loading} scroll={{ x: 1100 }}
        pagination={{ current: params.page, pageSize: params.pageSize, total: data.total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />

      <Modal title="新增开户" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="customerId" label="选择客户" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={customers.filter(c => c.status === 'ACTIVE').map((c) => ({ value: c.id, label: `${c.name} (${c.idNumber})` }))} />
          </Form.Item>
          <Form.Item name="type" label="账户类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'SAVINGS', label: '储蓄账户' }, { value: 'CHECKING', label: '活期账户' }, { value: 'FIXED_DEPOSIT', label: '定期存款' }]} />
          </Form.Item>
          <Form.Item name="currency" label="币种" initialValue="CNY">
            <Select options={[{ value: 'CNY', label: '人民币 (CNY)' }, { value: 'USD', label: '美元 (USD)' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
