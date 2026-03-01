import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Select, InputNumber, Input, message, Popconfirm, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { loanApi, customerApi } from '@/api';
import dayjs from 'dayjs';

export default function Loans() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, status: '', keyword: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
      const res: any = await loanApi.list(cleanParams);
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
    await loanApi.create(values);
    message.success('贷款申请提交成功');
    setModalOpen(false);
    form.resetFields();
    fetchData();
  };

  const handleApprove = async (id: number) => {
    await loanApi.approve(id);
    message.success('贷款已审批通过');
    fetchData();
  };

  const handleReject = async (id: number) => {
    await loanApi.reject(id);
    message.success('贷款已拒绝');
    fetchData();
  };

  const showDetail = async (id: number) => {
    const res: any = await loanApi.get(id);
    setDetail(res.data);
    setDetailOpen(true);
  };

  const statusMap: any = {
    PENDING: { color: 'orange', text: '待审批' },
    APPROVED: { color: 'green', text: '已批准' },
    REJECTED: { color: 'red', text: '已拒绝' },
    ACTIVE: { color: 'blue', text: '还款中' },
    COMPLETED: { color: 'default', text: '已结清' },
    OVERDUE: { color: 'volcano', text: '逾期' },
  };

  const typeMap: any = { PERSONAL: '个人贷款', MORTGAGE: '房贷', BUSINESS: '经营贷' };

  const columns = [
    { title: '贷款编号', dataIndex: 'loanNumber', width: 180 },
    { title: '客户', dataIndex: ['customer', 'name'], width: 100 },
    { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => typeMap[v] || v },
    {
      title: '金额', dataIndex: 'amount', width: 140,
      render: (v: number) => `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    { title: '利率(%)', dataIndex: 'interestRate', width: 90 },
    { title: '期限(月)', dataIndex: 'term', width: 90 },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
    { title: '申请时间', dataIndex: 'createdAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', width: 180, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => showDetail(record.id)}>详情</Button>
          {record.status === 'PENDING' && (
            <>
              <Popconfirm title="确认审批通过？" onConfirm={() => handleApprove(record.id)}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}>通过</Button>
              </Popconfirm>
              <Popconfirm title="确认拒绝？" onConfirm={() => handleReject(record.id)}>
                <Button type="link" size="small" danger>拒绝</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const repayColumns = [
    { title: '期数', render: (_: any, __: any, i: number) => i + 1, width: 60 },
    { title: '应还日期', dataIndex: 'dueDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '应还金额', dataIndex: 'amount', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '本金', dataIndex: 'principal', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '利息', dataIndex: 'interest', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'PAID' ? 'green' : v === 'OVERDUE' ? 'red' : 'default'}>{v === 'PAID' ? '已还' : v === 'OVERDUE' ? '逾期' : '待还'}</Tag> },
  ];

  return (
    <Card
      title="贷款管理"
      extra={
        <Space>
          <Input placeholder="搜索贷款号/客户" prefix={<SearchOutlined />} value={params.keyword}
            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })} style={{ width: 200 }} allowClear />
          <Select placeholder="状态" value={params.status || undefined} onChange={(v) => setParams({ ...params, status: v || '', page: 1 })} allowClear style={{ width: 120 }}
            options={Object.entries(statusMap).map(([k, v]: any) => ({ value: k, label: v.text }))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { loadCustomers(); form.resetFields(); setModalOpen(true); }}>新建申请</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={data.list} rowKey="id" loading={loading} scroll={{ x: 1200 }}
        pagination={{ current: params.page, pageSize: params.pageSize, total: data.total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />

      <Modal title="新建贷款申请" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="customerId" label="客户" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={customers.filter(c => c.status === 'ACTIVE').map((c) => ({ value: c.id, label: `${c.name} (${c.idNumber})` }))} />
          </Form.Item>
          <Form.Item name="type" label="贷款类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'PERSONAL', label: '个人贷款' }, { value: 'MORTGAGE', label: '房贷' }, { value: 'BUSINESS', label: '经营贷' }]} />
          </Form.Item>
          <Form.Item name="amount" label="贷款金额 (元)" rules={[{ required: true, type: 'number', min: 1000 }]}>
            <InputNumber style={{ width: '100%' }} min={1000} precision={2} />
          </Form.Item>
          <Form.Item name="interestRate" label="年利率 (%)" rules={[{ required: true, type: 'number', min: 0.01 }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} max={36} precision={2} />
          </Form.Item>
          <Form.Item name="term" label="期限 (月)" rules={[{ required: true, type: 'number', min: 1 }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={360} />
          </Form.Item>
          <Form.Item name="purpose" label="用途">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="贷款详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={700}>
        {detail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="贷款编号">{detail.loanNumber}</Descriptions.Item>
              <Descriptions.Item label="客户">{detail.customer?.name}</Descriptions.Item>
              <Descriptions.Item label="类型">{typeMap[detail.type]}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{detail.amount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="利率">{detail.interestRate}%</Descriptions.Item>
              <Descriptions.Item label="期限">{detail.term}个月</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="用途">{detail.purpose || '-'}</Descriptions.Item>
            </Descriptions>
            {detail.repayments?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>还款计划</h4>
                <Table columns={repayColumns} dataSource={detail.repayments} rowKey="id" pagination={false} size="small" scroll={{ y: 300 }} />
              </div>
            )}
          </>
        )}
      </Modal>
    </Card>
  );
}
