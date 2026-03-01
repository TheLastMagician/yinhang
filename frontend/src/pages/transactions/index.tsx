import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Select, InputNumber, Input, Tabs, message, DatePicker, Popconfirm, Descriptions } from 'antd';
import { DollarOutlined, PrinterOutlined } from '@ant-design/icons';
import { transactionApi, accountApi } from '@/api';
import { useAuthStore } from '@/store/auth';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function Transactions() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<any>({ page: 1, pageSize: 10, type: '', status: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [txnType, setTxnType] = useState('DEPOSIT');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));
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
    let result: any;
    if (txnType === 'DEPOSIT') {
      result = await transactionApi.deposit(values);
    } else if (txnType === 'WITHDRAWAL') {
      result = await transactionApi.withdraw(values);
    } else {
      result = await transactionApi.transfer(values);
    }
    message.success(result.message);
    setModalOpen(false);
    form.resetFields();
    fetchData();
  };

  const handleReview = async (id: number, action: string) => {
    await transactionApi.review(id, { action });
    message.success(action === 'APPROVE' ? '已审批通过' : '已拒绝');
    fetchData();
  };

  const showReceipt = async (id: number) => {
    const res: any = await transactionApi.get(id);
    setReceipt(res.data);
    setReceiptOpen(true);
  };

  const printReceipt = () => {
    const w = window.open('', '_blank');
    if (!w || !receipt) return;
    const typeMap: any = { DEPOSIT: '存款', WITHDRAWAL: '取款', TRANSFER: '转账' };
    w.document.write(`<html><head><title>交易回单</title><style>
      body { font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
      h2 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      td { padding: 8px 12px; border: 1px solid #ddd; }
      td:first-child { background: #f5f5f5; width: 120px; font-weight: bold; }
      .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
    </style></head><body>
      <h2>银行交易回单</h2>
      <table>
        <tr><td>交易号</td><td>${receipt.transactionNo}</td></tr>
        <tr><td>交易类型</td><td>${typeMap[receipt.type] || receipt.type}</td></tr>
        <tr><td>交易金额</td><td>¥${receipt.amount.toFixed(2)}</td></tr>
        ${receipt.fromAccount ? `<tr><td>转出账户</td><td>${receipt.fromAccount.accountNumber} (${receipt.fromAccount.customer?.name})</td></tr>` : ''}
        ${receipt.toAccount ? `<tr><td>转入账户</td><td>${receipt.toAccount.accountNumber} (${receipt.toAccount.customer?.name})</td></tr>` : ''}
        <tr><td>描述</td><td>${receipt.description || '-'}</td></tr>
        <tr><td>交易状态</td><td>${receipt.status === 'COMPLETED' ? '已完成' : receipt.status}</td></tr>
        <tr><td>交易时间</td><td>${dayjs(receipt.createdAt).format('YYYY-MM-DD HH:mm:ss')}</td></tr>
      </table>
      <div class="footer">此回单由系统自动生成 | ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const typeMap: any = { DEPOSIT: { color: 'green', text: '存款' }, WITHDRAWAL: { color: 'red', text: '取款' }, TRANSFER: { color: 'blue', text: '转账' } };
  const statusMap: any = { COMPLETED: { c: 'green', t: '已完成' }, PENDING_REVIEW: { c: 'orange', t: '待审批' }, REJECTED: { c: 'red', t: '已拒绝' } };

  const columns = [
    { title: '交易号', dataIndex: 'transactionNo', width: 190 },
    { title: '类型', dataIndex: 'type', width: 70, render: (v: string) => <Tag color={typeMap[v]?.color}>{typeMap[v]?.text}</Tag> },
    { title: '金额', dataIndex: 'amount', width: 130, render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>¥{v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span> },
    { title: '转出', dataIndex: 'fromAccount', width: 160, render: (v: any) => v ? `${v.customer?.name} (${v.accountNumber.slice(-6)})` : '-' },
    { title: '转入', dataIndex: 'toAccount', width: 160, render: (v: any) => v ? `${v.customer?.name} (${v.accountNumber.slice(-6)})` : '-' },
    { title: '描述', dataIndex: 'description', width: 120, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={statusMap[v]?.c || 'default'}>{statusMap[v]?.t || v}</Tag> },
    { title: '时间', dataIndex: 'createdAt', width: 140, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', width: 160, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => showReceipt(record.id)}>回单</Button>
          {record.status === 'PENDING_REVIEW' && ['ADMIN', 'MANAGER'].includes(user?.role || '') && (
            <>
              <Popconfirm title="确认通过？" onConfirm={() => handleReview(record.id, 'APPROVE')}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}>通过</Button>
              </Popconfirm>
              <Popconfirm title="确认拒绝？" onConfirm={() => handleReview(record.id, 'REJECT')}>
                <Button type="link" size="small" danger>拒绝</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.customer?.name} - ${a.accountNumber} (¥${a.balance.toLocaleString()})`,
  }));

  return (
    <Card
      title="交易管理"
      extra={
        <Space wrap>
          <RangePicker size="small"
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setParams({ ...params, startDate: dates[0].toISOString(), endDate: dates[1].toISOString(), page: 1 });
              } else {
                const { startDate: _, endDate: __, ...rest } = params;
                setParams({ ...rest, page: 1 });
              }
            }} />
          <Select placeholder="类型" value={params.type || undefined} onChange={(v) => setParams({ ...params, type: v || '', page: 1 })} allowClear style={{ width: 100 }} size="small"
            options={[{ value: 'DEPOSIT', label: '存款' }, { value: 'WITHDRAWAL', label: '取款' }, { value: 'TRANSFER', label: '转账' }]} />
          <Select placeholder="状态" value={params.status || undefined} onChange={(v) => setParams({ ...params, status: v || '', page: 1 })} allowClear style={{ width: 100 }} size="small"
            options={[{ value: 'COMPLETED', label: '已完成' }, { value: 'PENDING_REVIEW', label: '待审批' }, { value: 'REJECTED', label: '已拒绝' }]} />
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

      <Modal title="交易回单" open={receiptOpen} onCancel={() => setReceiptOpen(false)} footer={
        <Button type="primary" icon={<PrinterOutlined />} onClick={printReceipt}>打印回单</Button>
      } width={550}>
        {receipt && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="交易号" span={2}>{receipt.transactionNo}</Descriptions.Item>
            <Descriptions.Item label="类型">{typeMap[receipt.type]?.text}</Descriptions.Item>
            <Descriptions.Item label="金额">¥{receipt.amount.toFixed(2)}</Descriptions.Item>
            {receipt.fromAccount && <Descriptions.Item label="转出账户">{receipt.fromAccount.accountNumber}</Descriptions.Item>}
            {receipt.fromAccount && <Descriptions.Item label="转出客户">{receipt.fromAccount.customer?.name}</Descriptions.Item>}
            {receipt.toAccount && <Descriptions.Item label="转入账户">{receipt.toAccount.accountNumber}</Descriptions.Item>}
            {receipt.toAccount && <Descriptions.Item label="转入客户">{receipt.toAccount.customer?.name}</Descriptions.Item>}
            <Descriptions.Item label="描述">{receipt.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusMap[receipt.status]?.c}>{statusMap[receipt.status]?.t}</Tag></Descriptions.Item>
            <Descriptions.Item label="交易时间" span={2}>{dayjs(receipt.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
}
