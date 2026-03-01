import prisma from '../utils/prisma';

export async function createNotification(params: {
  userId: number;
  title: string;
  content: string;
  type?: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      content: params.content,
      type: params.type || 'INFO',
      link: params.link,
    },
  });
}

export async function notifyRole(role: string, params: {
  title: string;
  content: string;
  type?: string;
  link?: string;
}) {
  const users = await prisma.user.findMany({
    where: { role, status: 'ACTIVE' },
    select: { id: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map(u => ({
      userId: u.id,
      title: params.title,
      content: params.content,
      type: params.type || 'INFO',
      link: params.link,
    })),
  });
}
