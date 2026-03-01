import { useEffect, useState } from 'react';
import { Card, Table, Button, Input, message, Tag, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { systemConfigApi } from '@/api';

export default function Settings() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<number, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await systemConfigApi.list();
      setConfigs(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (record: any) => {
    const value = editValues[record.id];
    if (value === undefined || value === record.value) return;

    await systemConfigApi.update(record.id, { value });
    message.success(`${record.label} 已更新`);
    setEditValues(prev => { const n = { ...prev }; delete n[record.id]; return n; });
    fetchData();
  };

  const categoryColorMap: Record<string, string> = {
    '基本设置': 'blue', '交易设置': 'green', '利率设置': 'orange', '贷款设置': 'purple', '安全设置': 'red',
  };

  const columns = [
    { title: '配置项', dataIndex: 'label', width: 180 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag color={categoryColorMap[v] || 'default'}>{v}</Tag>,
    },
    { title: '配置键', dataIndex: 'key', width: 200 },
    {
      title: '当前值', dataIndex: 'value', width: 200,
      render: (v: string, record: any) => (
        <Input
          value={editValues[record.id] !== undefined ? editValues[record.id] : v}
          onChange={(e) => setEditValues(prev => ({ ...prev, [record.id]: e.target.value }))}
          style={{ width: 180 }}
        />
      ),
    },
    {
      title: '操作', width: 80,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={() => handleSave(record)}
          disabled={editValues[record.id] === undefined || editValues[record.id] === record.value}
        >
          保存
        </Button>
      ),
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const grouped = configs.reduce((acc: Record<string, any[]>, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} title={category} size="small" style={{ marginBottom: 16 }}>
          <Table
            columns={columns}
            dataSource={items}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      ))}
    </div>
  );
}
