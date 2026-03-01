import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Tag, Statistic, Spin } from 'antd';
import {
  UserOutlined,
  BankOutlined,
  TransactionOutlined,
  FileTextOutlined,
  DollarOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { dashboardApi } from '@/api';
import dayjs from 'dayjs';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    dashboardApi.getStats().then((res: any) => {
      setStats(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const { overview, recentTransactions, recentAuditLogs } = stats;

  const statCards = [
    { title: '活跃客户', value: overview.customerCount, icon: <UserOutlined />, color: '#1677ff' },
    { title: '活跃账户', value: overview.accountCount, icon: <BankOutlined />, color: '#52c41a' },
    { title: '总存款余额', value: overview.totalBalance, prefix: '¥', icon: <DollarOutlined />, color: '#faad14', precision: 2 },
    { title: '今日交易', value: overview.todayTransactions, icon: <TransactionOutlined />, color: '#13c2c2' },
    { title: '待审批贷款', value: overview.pendingLoans, icon: <AlertOutlined />, color: '#eb2f96' },
    { title: '贷款总额', value: overview.totalLoanAmount, prefix: '¥', icon: <FileTextOutlined />, color: '#722ed1', precision: 2 },
  ];

  const txnColumns = [
    { title: '交易号', dataIndex: 'transactionNo', key: 'transactionNo', width: 200 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (t: string) => {
        const map: any = { DEPOSIT: { color: 'green', text: '存款' }, WITHDRAWAL: { color: 'red', text: '取款' }, TRANSFER: { color: 'blue', text: '转账' } };
        return <Tag color={map[t]?.color}>{map[t]?.text || t}</Tag>;
      },
    },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  const auditColumns = [
    { title: '操作人', dataIndex: ['user', 'name'], key: 'user', width: 100 },
    { title: '操作', dataIndex: 'action', key: 'action', width: 100 },
    { title: '模块', dataIndex: 'module', key: 'module', width: 100 },
    { title: '对象', dataIndex: 'target', key: 'target', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        {statCards.map((card, i) => (
          <Col xs={12} sm={8} md={4} key={i}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.prefix}
                precision={card.precision}
                valueStyle={{ color: card.color, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="最近交易" size="small">
            <Table columns={txnColumns} dataSource={recentTransactions} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="操作日志" size="small">
            <Table columns={auditColumns} dataSource={recentAuditLogs} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
