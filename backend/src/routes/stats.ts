/**
 * Stats Routes
 * GET /api/v1/stats/platform  — aggregate platform metrics
 * GET /api/v1/stats/leaderboard — top agents by calls/revenue
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const statsRouter = Router();

statsRouter.get('/platform', async (_req: Request, res: Response) => {
  try {
    const [totalAgents, totalCallsResult, totalVolumeResult, uniqueCallersResult] =
      await Promise.all([
        prisma.agent.count({ where: { status: 'ACTIVE' } }),
        prisma.agentCall.aggregate({
          where: { status: 'COMPLETED' },
          _count: true,
          _sum:   { amountUsdc: true },
        }),
        prisma.agentCall.groupBy({
          by:     ['callerWallet'],
          where:  { status: 'COMPLETED' },
          _count: true,
        }),
        prisma.agentCall.aggregate({
          where:  { status: 'COMPLETED' },
          _avg:   { responseMs: true },
        }),
      ]);

    res.json({
      totalAgents,
      totalCalls:        totalCallsResult._count,
      totalVolumeUsdc:   totalCallsResult._sum.amountUsdc?.toString() || '0',
      uniqueCallers:     uniqueCallersResult.length,
      avgResponseMs:     Math.round(uniqueCallersResult.length > 0
                           ? (totalVolumeResult._avg.responseMs || 0)
                           : 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

statsRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { by = 'calls', limit = '10' } = req.query as Record<string, string>;

    const orderBy = by === 'revenue'
      ? { totalRevenueUsdc: 'desc' as const }
      : { totalCalls: 'desc' as const };

    const agents = await prisma.agent.findMany({
      where:   { status: 'ACTIVE' },
      orderBy,
      take:    parseInt(limit),
      select: {
        id: true, name: true, slug: true, category: true,
        totalCalls: true, totalRevenueUsdc: true,
        avgResponseMs: true, uptimePct: true, isVerified: true,
        owner: { select: { walletAddress: true, username: true } },
      },
    });

    res.json({ leaderboard: agents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
