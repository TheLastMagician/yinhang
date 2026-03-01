import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Select, InputNumber, Input, Tabs, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { transactionApi, accountApi } from '@/api';
import dayjs from 'dayjs';

export default function Transactions() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, type: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [txnType, setTxnType] = useState('DEPOSIT');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
      const res: any = await transactionApi.list(cleanParams);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadAccounts = async () => {
    const res: any = await accountApi.list({ pageSize: 1000, status: 'ACTIVE' });
    setAccounts(res.data.list);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (txnType === 'DEPOSIT') {
      await transactionApi.deposit(values);
      message.success('存款成功');
    } else if (txnType === 'WITHDRAWAL') {
      await transactionApi.withdraw(values);
      message.success('取款成功');
    } else {
      await transactionApi.transfer(values);
      message.success('转账成功');
    }
    setModalOpen(false);
    form.resetFields();
    fetchData();
  };

  const typeMap: any = { DEPOSIT: { color: 'green', text: '存款' }, WITHDRAWAL: { color: 'red', text: '取款' }, TRANSFER: { color: 'blue', text: '转账' } };

  const columns = [
    { title: '交易号', dataIndex: 'transactionNo', width: 200 },
    { title: '类型', dataIndex: 'type', width: 80, render: (v: string) => <Tag color={typeMap[v]?.color}>{typeMap[v]?.text}</Tag> },
    {
      title: '金额', dataIndex: 'amount', width: 140,
      render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: '转出账户', dataIndex: 'fromAccount', width: 180,
      render: (v: any) => v ? <span>{v.customer?.name} ({v.accountNumber})</span> : '-',
    },
    {
      title: '转入账户', dataIndex: 'toAccount', width: 180,
      render: (v: any) => v ? <span>{v.customer?.name} ({v.accountNumber})</span> : '-',
    },
    { title: '描述', dataIndex: 'description', width: 150, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'COMPLETED' ? 'green' : 'default'}>{v === 'COMPLETED' ? '已完成' : v}</Tag> },
    { title: '时间', dataIndex: 'createdAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ];

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.customer?.name} - ${a.accountNumber} (¥${a.balance.toLocaleString()})`,
  }));

  return (
    <Card
      title="交易管理"
      extra={
        <Space>
          <Select placeholder="交易类型" value={params.type || undefined} onChange={(v) => setParams({ ...params, type: v || '', page: 1 })} allowClear style={{ width: 120 }}
            options={[{ value: 'DEPOSIT', label: '存款' }, { value: 'WITHDRAWAL', label: '取款' }, { value: 'TRANSFER', label: '转账' }]} />
          <Button type="primary" icon={<DollarOutlined />} onClick={() => { loadAccounts(); form.resetFields(); setModalOpen(true); }}>新建交易</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={data.list} rowKey="id" loading={loading} scroll={{ x: 1300 }}
        pagination={{ current: params.page, pageSize: params.pageSize, total: data.total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />

      <Modal title="新建交易" open={modalOpen} onOk={handleSubmit} onCancel={() => { setModalOpen(false); form.resetFields(); }} width={500}>
        <Tabs activeKey={txnType} onChange={(k) => { setTxnType(k); form.resetFields(); }}
          items={[{ key: 'DEPOSIT', label: '存款' }, { key: 'WITHDRAWAL', label: '取款' }, { key: 'TRANSFER', label: '转账' }]} />
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {txnType === 'TRANSFER' ? (
            <>
              <Form.Item name="fromAccountId" label="转出账户" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={accountOptions} />
              </Form.Item>
              <Form.Item name="toAccountId" label="转入账户" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={accountOptions} />
              </Form.Item>
            </>
          ) : (
            <Form.Item name="accountId" label={txnType === 'DEPOSIT' ? '存入账户' : '取款账户'} rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={accountOptions} />
            </Form.Item>
          )}
          <Form.Item name="amount" label="金额 (元)" rules={[{ required: true, type: 'number', min: 0.01 }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
