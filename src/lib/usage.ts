import { auth, currentUser } from '@clerk/nextjs/server';

import { hasUnlimitedCreditMetadata } from './credit-access';
import { FREE_GENERATION_CREDITS, PRO_GENERATION_CREDITS } from './credit-plan';
import prisma from './prisma';

export async function hasUnlimitedCredits() {
  const user = await currentUser();
  return hasUnlimitedCreditMetadata(user?.privateMetadata);
}

export async function getUsageStatus() {
  const { userId, has } = await auth();

  if (!userId) {
    throw new Error('User not autheticated');
  }

  const isUnlimited =
    process.env.NODE_ENV === 'development' || (await hasUnlimitedCredits());

  if (isUnlimited) {
    return {
      remainingPoints: null,
      msBeforeNext: 0,
      consumedPoints: 0,
      isFirstInDuration: true,
      isUnlimited: true,
    };
  }

  const result = await prisma.usage.findUnique({ where: { key: userId } });
  const now = Date.now();
  const expired = !result?.expire || result.expire.getTime() <= now;
  const consumedPoints = expired ? 0 : result.points;
  const allowance = has({ plan: 'pro' })
    ? PRO_GENERATION_CREDITS
    : FREE_GENERATION_CREDITS;
  return {
    remainingPoints: Math.max(0, allowance - consumedPoints),
    msBeforeNext: expired ? 0 : Math.max(0, result.expire!.getTime() - now),
    consumedPoints,
    isFirstInDuration: !result || expired,
    isUnlimited: false,
  };
}
