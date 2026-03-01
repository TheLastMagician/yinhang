import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Tag, Statistic, Spin, Alert } from 'antd';
import {
  UserOutlined, BankOutlined, TransactionOutlined,
  DollarOutlined, AlertOutlined, ExclamationCircleOutlined, ClockCircleOutlined, BankOutlined as BankIcon,
} from '@ant-design/icons';
import { dashboardApi } from '@/api';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/auth';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    dashboardApi.getStats().then((res: any) => {
      setStats(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const { overview, recentTransactions, recentAuditLogs, last7Days } = stats;

  const statCards = [
    { title: '活跃客户', value: overview.customerCount, icon: <UserOutlined />, color: '#1677ff' },
    { title: '活跃账户', value: overview.accountCount, icon: <BankOutlined />, color: '#52c41a' },
    { title: '总存款余额', value: overview.totalBalance, prefix: '¥', icon: <DollarOutlined />, color: '#faad14', precision: 2 },
    { title: '今日交易', value: overview.todayTransactions, icon: <TransactionOutlined />, color: '#13c2c2' },
    { title: '今日交易额', value: overview.todayAmount, prefix: '¥', icon: <DollarOutlined />, color: '#722ed1', precision: 2 },
    { title: '待审批贷款', value: overview.pendingLoans, icon: <AlertOutlined />, color: '#eb2f96' },
    { title: '逾期还款', value: overview.overdueRepayments, icon: <ExclamationCircleOutlined />, color: '#ff4d4f' },
    { title: '待审批交易', value: overview.pendingReviewTxns, icon: <ClockCircleOutlined />, color: '#fa8c16' },
  ];

  const txnColumns = [
    { title: '交易号', dataIndex: 'transactionNo', width: 190, ellipsis: true },
    {
      title: '类型', dataIndex: 'type', width: 70,
      render: (t: string) => {
        const map: any = { DEPOSIT: { color: 'green', text: '存款' }, WITHDRAWAL: { color: 'red', text: '取款' }, TRANSFER: { color: 'blue', text: '转账' } };
        return <Tag color={map[t]?.color}>{map[t]?.text || t}</Tag>;
      },
    },
    { title: '金额', dataIndex: 'amount', width: 110, render: (v: number) => `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => {
        const m: any = { COMPLETED: { c: 'green', t: '完成' }, PENDING_REVIEW: { c: 'orange', t: '待审' }, REJECTED: { c: 'red', t: '拒绝' } };
        return <Tag color={m[v]?.c || 'default'}>{m[v]?.t || v}</Tag>;
      },
    },
    { title: '时间', dataIndex: 'createdAt', width: 110, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  const auditColumns = [
    { title: '操作人', dataIndex: ['user', 'name'], width: 80 },
    { title: '操作', dataIndex: 'action', width: 80 },
    { title: '模块', dataIndex: 'module', width: 80 },
    { title: '对象', dataIndex: 'target', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 110, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  const trendColumns = [
    { title: '日期', dataIndex: 'date', width: 70 },
    { title: '笔数', dataIndex: 'count', width: 60 },
    { title: '金额(¥)', dataIndex: 'amount', render: (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) },
  ];

  return (
    <div>
      {(overview.pendingReviewTxns > 0 || overview.overdueRepayments > 0) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              {overview.pendingReviewTxns > 0 && `${overview.pendingReviewTxns} 笔大额交易待审批`}
              {overview.pendingReviewTxns > 0 && overview.overdueRepayments > 0 && ' | '}
              {overview.overdueRepayments > 0 && `${overview.overdueRepayments} 笔贷款还款逾期`}
            </span>
          }
        />
      )}

      <Row gutter={[12, 12]}>
        {statCards.map((card, i) => (
          <Col xs={12} sm={8} md={6} lg={3} key={i}>
            <Card size="small">
              <Statistic title={card.title} value={card.value} prefix={card.prefix} precision={card.precision}
                valueStyle={{ color: card.color, fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="近7天交易趋势" size="small">
            <Table columns={trendColumns} dataSource={last7Days} rowKey="date" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="最近交易" size="small">
            <Table columns={txnColumns} dataSource={recentTransactions} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
      </Row>

      {['ADMIN', 'MANAGER', 'AUDITOR'].includes(user?.role || '') && (
        <Card title="操作日志" size="small" style={{ marginTop: 16 }}>
          <Table columns={auditColumns} dataSource={recentAuditLogs} rowKey="id" pagination={false} size="small" />
        </Card>
      )}
    </div>
  );
}
