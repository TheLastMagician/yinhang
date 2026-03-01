import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Table, Statistic, Row, Col, Button, Spin, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { customerApi } from '@/api';
import dayjs from 'dayjs';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      customerApi.get(parseInt(id)).then((res: any) => {
        setCustomer(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!customer) return null;

  const statusMap: any = { ACTIVE: { color: 'green', text: '正常' }, INACTIVE: { color: 'default', text: '停用' }, BLACKLISTED: { color: 'red', text: '黑名单' } };
  const riskMap: any = { LOW: { color: 'green', text: '低' }, MEDIUM: { color: 'orange', text: '中' }, HIGH: { color: 'red', text: '高' } };
  const accTypeMap: any = { SAVINGS: '储蓄', CHECKING: '活期', FIXED_DEPOSIT: '定期' };

  const accountCols = [
    { title: '账号', dataIndex: 'accountNumber' },
    { title: '类型', dataIndex: 'type', render: (v: string) => accTypeMap[v] || v },
    { title: '余额', dataIndex: 'balance', render: (v: number) => `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` },
    { title: '利率', dataIndex: 'interestRate', render: (v: number) => `${v}%` },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : v === 'FROZEN' ? 'orange' : 'red'}>{v === 'ACTIVE' ? '正常' : v === 'FROZEN' ? '冻结' : '已销户'}</Tag> },
    { title: '开户日期', dataIndex: 'openDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ];

  const loanCols = [
    { title: '贷款编号', dataIndex: 'loanNumber' },
    { title: '类型', dataIndex: 'type', render: (v: string) => v === 'PERSONAL' ? '个人' : v === 'MORTGAGE' ? '房贷' : '经营' },
    { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '利率', dataIndex: 'interestRate', render: (v: number) => `${v}%` },
    { title: '期限', dataIndex: 'term', render: (v: number) => `${v}个月` },
    { title: '状态', dataIndex: 'status', render: (v: string) => {
      const map: any = { PENDING: '待审批', APPROVED: '已批准', REJECTED: '已拒绝', ACTIVE: '还款中', COMPLETED: '已结清' };
      const colorMap: any = { PENDING: 'orange', APPROVED: 'blue', REJECTED: 'red', ACTIVE: 'green', COMPLETED: 'default' };
      return <Tag color={colorMap[v]}>{map[v] || v}</Tag>;
    }},
    { title: '申请时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} style={{ marginBottom: 16 }}>返回客户列表</Button>

      <Card title={`客户详情 - ${customer.name}`} style={{ marginBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="总存款" value={customer.totalBalance} prefix="¥" precision={2} /></Col>
          <Col span={6}><Statistic title="总贷款" value={customer.totalLoan} prefix="¥" precision={2} /></Col>
          <Col span={6}><Statistic title="账户数" value={customer.accounts?.length || 0} /></Col>
          <Col span={6}><Statistic title="贷款数" value={customer.loans?.length || 0} /></Col>
        </Row>

        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="姓名">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="证件类型">{customer.idType === 'ID_CARD' ? '身份证' : '护照'}</Descriptions.Item>
          <Descriptions.Item label="证件号码">{customer.idNumber}</Descriptions.Item>
          <Descriptions.Item label="电话">{customer.phone}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{customer.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{customer.gender === 'MALE' ? '男' : customer.gender === 'FEMALE' ? '女' : '-'}</Descriptions.Item>
          <Descriptions.Item label="出生日期">{customer.birthDate ? dayjs(customer.birthDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
          <Descriptions.Item label="职业">{customer.occupation || '-'}</Descriptions.Item>
          <Descriptions.Item label="风险等级"><Tag color={riskMap[customer.riskLevel]?.color}>{riskMap[customer.riskLevel]?.text}</Tag></Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={statusMap[customer.status]?.color}>{statusMap[customer.status]?.text}</Tag></Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{customer.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{dayjs(customer.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={[
          {
            key: 'accounts',
            label: `账户 (${customer.accounts?.length || 0})`,
            children: <Table columns={accountCols} dataSource={customer.accounts} rowKey="id" size="small" pagination={false} />,
          },
          {
            key: 'loans',
            label: `贷款 (${customer.loans?.length || 0})`,
            children: <Table columns={loanCols} dataSource={customer.loans} rowKey="id" size="small" pagination={false} />,
          },
        ]} />
      </Card>
    </div>
  );
}
