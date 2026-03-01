import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { auditApi } from '@/api';
import dayjs from 'dayjs';

export default function AuditLogs() {
  const [data, setData] = useState<any>({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ page: 1, pageSize: 10, module: '', action: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
      const res: any = await auditApi.list(cleanParams);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '操作人', dataIndex: ['user', 'name'], width: 100 },
    { title: '操作', dataIndex: 'action', width: 100 },
    { title: '模块', dataIndex: 'module', width: 100 },
    { title: '对象', dataIndex: 'target', width: 200, ellipsis: true },
    { title: '详情', dataIndex: 'detail', width: 250, ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
  ];

  return (
    <Card
      title="审计日志"
      extra={
        <Space>
          <Input placeholder="搜索操作" prefix={<SearchOutlined />} value={params.action}
            onChange={(e) => setParams({ ...params, action: e.target.value, page: 1 })} style={{ width: 160 }} allowClear />
          <Select placeholder="模块" value={params.module || undefined} onChange={(v) => setParams({ ...params, module: v || '', page: 1 })} allowClear style={{ width: 130 }}
            options={[{ value: '认证', label: '认证' }, { value: '用户管理', label: '用户管理' }, { value: '客户管理', label: '客户管理' }, { value: '账户管理', label: '账户管理' }, { value: '交易管理', label: '交易管理' }, { value: '贷款管理', label: '贷款管理' }]} />
        </Space>
      }
    >
      <Table columns={columns} dataSource={data.list} rowKey="id" loading={loading} scroll={{ x: 1100 }}
        pagination={{ current: params.page, pageSize: params.pageSize, total: data.total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />
    </Card>
  );
}
