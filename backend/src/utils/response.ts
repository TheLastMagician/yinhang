import { Response } from 'express';

export function success(res: Response, data: any = null, message = '操作成功') {
  return res.json({ code: 0, message, data });
}

export function error(res: Response, message = '操作失败', code = 1, status = 400) {
  return res.status(status).json({ code, message, data: null });
}

export function paginate(res: Response, data: any[], total: number, page: number, pageSize: number) {
  return res.json({
    code: 0,
    message: '操作成功',
    data: {
      list: data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
