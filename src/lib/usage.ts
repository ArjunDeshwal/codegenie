import { RateLimiterPrisma } from 'rate-limiter-flexible';
import { auth } from '@clerk/nextjs/server';

import prisma from './prisma';

const FREE_POINTS = 1;
const PRO_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60; // 30 days
const GENERATION_COST = 1;

export async function getUsageTracker() {
  const { has } = await auth();
  const hasProAccess = has({ plan: 'pro' });

  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: 'Usage',
    points: hasProAccess ? PRO_POINTS : FREE_POINTS,
    duration: DURATION,
  });

  return usageTracker;
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('User not autheticated');
  }

  // Local development should never consume a user's production allowance.
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST);

  return result;
}

export async function getUsageStatus() {
  const { userId } = await auth();

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

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);

  return result;
}
