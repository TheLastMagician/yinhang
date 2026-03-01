import axios from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data.code !== 0) {
      message.error(data.message || '请求失败');
      return Promise.reject(new Error(data.message));
    }
    return data;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else {
      message.error(err.response?.data?.message || '网络错误');
    }
    return Promise.reject(err);
  },
);

export default request;
