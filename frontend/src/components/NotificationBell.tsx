import { useEffect, useState } from 'react';
import { Badge, Dropdown, List, Typography, Button, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { notificationApi } from '@/api';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function NotificationBell() {
  const [data, setData] = useState<{ notifications: any[]; unreadCount: number }>({ notifications: [], unreadCount: 0 });

  const fetchNotifications = async () => {
    try {
      const res: any = await notificationApi.list();
      setData(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleReadAll = async () => {
    await notificationApi.readAll();
    fetchNotifications();
  };

  const typeColorMap: Record<string, string> = { INFO: '#1677ff', WARNING: '#faad14', ERROR: '#ff4d4f', SUCCESS: '#52c41a' };

  const menu = {
    items: [{
      key: 'list',
      label: (
        <div style={{ width: 360, maxHeight: 400, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Text strong>通知中心</Text>
            {data.unreadCount > 0 && (
              <Button type="link" size="small" onClick={handleReadAll}>全部已读</Button>
            )}
          </div>
          {data.notifications.length === 0 ? (
            <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
          ) : (
            <List
              size="small"
              dataSource={data.notifications.slice(0, 20)}
              renderItem={(item: any) => (
                <List.Item style={{ padding: '8px 0', opacity: item.isRead ? 0.6 : 1 }}>
                  <div>
                    <div>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: typeColorMap[item.type] || '#1677ff', display: 'inline-block', marginRight: 6 }} />
                      <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.content}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.createdAt).format('MM-DD HH:mm')}</Text></div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      ),
    }],
  };

  return (
    <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
      <Badge count={data.unreadCount} size="small" offset={[-2, 4]}>
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
}
