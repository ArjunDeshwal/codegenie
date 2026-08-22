import { auth } from '@clerk/nextjs/server';

import prisma from './prisma';

const FREE_POINTS = 1;
const PRO_POINTS = 100;
export async function getUsageStatus() {
  const { userId, has } = await auth();

  if (!userId) {
    throw new Error('User not autheticated');
  }

  if (process.env.NODE_ENV === 'development') {
    return {
      remainingPoints: 999,
      msBeforeNext: 0,
      consumedPoints: 0,
      isFirstInDuration: true,
    };
  }

  const result = await prisma.usage.findUnique({ where: { key: userId } });
  const now = Date.now();
  const expired = !result?.expire || result.expire.getTime() <= now;
  const consumedPoints = expired ? 0 : result.points;
  const allowance = has({ plan: 'pro' }) ? PRO_POINTS : FREE_POINTS;
  return {
    remainingPoints: Math.max(0, allowance - consumedPoints),
    msBeforeNext: expired ? 0 : Math.max(0, result.expire!.getTime() - now),
    consumedPoints,
    isFirstInDuration: !result || expired,
  };
}
