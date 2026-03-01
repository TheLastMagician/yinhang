import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Tabs, Table, Tag, Select, Spin, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { reportApi } from '@/api';
import dayjs from 'dayjs';

export default function Reports() {
  const [txnSummary, setTxnSummary] = useState<any>(null);
  const [loanSummary, setLoanSummary] = useState<any>(null);
  const [custSummary, setCustSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txn, loan, cust] = await Promise.all([
        reportApi.transactionSummary({ days }),
        reportApi.loanSummary(),
        reportApi.customerSummary(),
      ]);
      setTxnSummary((txn as any).data);
      setLoanSummary((loan as any).data);
      setCustSummary((cust as any).data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [days]);

  const handleExport = async () => {
    try {
      const res = await reportApi.exportTransactions({ days }) as any;
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${dayjs().format('YYYYMMDD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch { message.error('导出失败'); }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const statusMap: any = { PENDING: '待审批', APPROVED: '已批准', REJECTED: '已拒绝', ACTIVE: '还款中', COMPLETED: '已结清', OVERDUE: '逾期' };
  const typeMap: any = { PERSONAL: '个人贷款', MORTGAGE: '房贷', BUSINESS: '经营贷' };

  const loanStatusCols = [
    { title: '状态', dataIndex: 'status', render: (v: string) => statusMap[v] || v },
    { title: '数量', dataIndex: '_count' },
    { title: '总金额', dataIndex: ['_sum', 'amount'], render: (v: number) => v ? `¥${v.toLocaleString()}` : '¥0' },
  ];

  const loanTypeCols = [
    { title: '类型', dataIndex: 'type', render: (v: string) => typeMap[v] || v },
    { title: '数量', dataIndex: '_count' },
    { title: '总金额', dataIndex: ['_sum', 'amount'], render: (v: number) => v ? `¥${v.toLocaleString()}` : '¥0' },
  ];

  const repaymentCols = [
    { title: '贷款号', dataIndex: ['loan', 'loanNumber'] },
    { title: '客户', dataIndex: ['loan', 'customer', 'name'] },
    { title: '应还金额', dataIndex: 'amount', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '到期日', dataIndex: 'dueDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'PAID' ? 'green' : v === 'OVERDUE' ? 'red' : 'orange'}>{v === 'PAID' ? '已还' : v === 'OVERDUE' ? '逾期' : '待还'}</Tag> },
  ];

  const topCustomerCols = [
    { title: '排名', render: (_: any, __: any, i: number) => i + 1, width: 60 },
    { title: '客户', dataIndex: ['customer', 'name'] },
    { title: '总存款', dataIndex: ['_sum', 'balance'], render: (v: number) => `¥${(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` },
  ];

  const accTypeCols = [
    { title: '类型', dataIndex: 'type', render: (v: string) => v === 'SAVINGS' ? '储蓄' : v === 'CHECKING' ? '活期' : '定期' },
    { title: '数量', dataIndex: '_count' },
    { title: '总余额', dataIndex: ['_sum', 'balance'], render: (v: number) => `¥${(v || 0).toLocaleString()}` },
  ];

  return (
    <div>
      <Tabs items={[
        {
          key: 'txn',
          label: '交易报表',
          children: (
            <>
              <Card size="small" extra={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Select value={days} onChange={setDays} options={[{ value: 7, label: '近7天' }, { value: 30, label: '近30天' }, { value: 90, label: '近90天' }]} />
                  <Button icon={<DownloadOutlined />} onClick={handleExport}>导出CSV</Button>
                </div>
              }>
                <Row gutter={16}>
                  <Col span={6}><Statistic title="总存款" value={txnSummary?.totalDeposit || 0} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} /></Col>
                  <Col span={6}><Statistic title="总取款" value={txnSummary?.totalWithdrawal || 0} prefix="¥" precision={2} valueStyle={{ color: '#ff4d4f' }} /></Col>
                  <Col span={6}><Statistic title="总转账" value={txnSummary?.totalTransfer || 0} prefix="¥" precision={2} valueStyle={{ color: '#1677ff' }} /></Col>
                  <Col span={6}><Statistic title="交易笔数" value={txnSummary?.totalCount || 0} /></Col>
                </Row>
              </Card>
              {txnSummary?.dailyData?.length > 0 && (
                <Card title="每日交易统计" size="small" style={{ marginTop: 16 }}>
                  <Table
                    columns={[
                      { title: '日期', dataIndex: 'date' },
                      { title: '存款(¥)', dataIndex: 'deposit', render: (v: number) => v.toLocaleString() },
                      { title: '取款(¥)', dataIndex: 'withdrawal', render: (v: number) => v.toLocaleString() },
                      { title: '转账(¥)', dataIndex: 'transfer', render: (v: number) => v.toLocaleString() },
                      { title: '笔数', dataIndex: 'count' },
                    ]}
                    dataSource={txnSummary.dailyData}
                    rowKey="date"
                    size="small"
                    pagination={false}
                  />
                </Card>
              )}
            </>
          ),
        },
        {
          key: 'loan',
          label: '贷款报表',
          children: (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}><Card><Statistic title="逾期还款" value={loanSummary?.overdueRepayments || 0} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
                <Col span={8}><Card><Statistic title="已回收金额" value={loanSummary?.totalRepaid || 0} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col span={8}><Card><Statistic title="近7天到期还款" value={loanSummary?.upcomingRepayments?.length || 0} valueStyle={{ color: '#faad14' }} /></Card></Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}><Card title="按状态" size="small"><Table columns={loanStatusCols} dataSource={loanSummary?.loansByStatus || []} rowKey="status" size="small" pagination={false} /></Card></Col>
                <Col span={12}><Card title="按类型" size="small"><Table columns={loanTypeCols} dataSource={loanSummary?.loansByType || []} rowKey="type" size="small" pagination={false} /></Card></Col>
              </Row>
              {loanSummary?.upcomingRepayments?.length > 0 && (
                <Card title="即将到期还款" size="small" style={{ marginTop: 16 }}>
                  <Table columns={repaymentCols} dataSource={loanSummary.upcomingRepayments} rowKey="id" size="small" pagination={false} />
                </Card>
              )}
            </>
          ),
        },
        {
          key: 'customer',
          label: '客户报表',
          children: (
            <Row gutter={16}>
              <Col span={12}><Card title="存款排名 Top 10" size="small"><Table columns={topCustomerCols} dataSource={custSummary?.topCustomers || []} rowKey="customerId" size="small" pagination={false} /></Card></Col>
              <Col span={12}><Card title="账户类型分布" size="small"><Table columns={accTypeCols} dataSource={custSummary?.accountsByType || []} rowKey="type" size="small" pagination={false} /></Card></Col>
            </Row>
          ),
        },
      ]} />
    </div>
  );
}
