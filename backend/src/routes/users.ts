import { Router, Request, Response } from 'express';
import { z }            from 'zod';
import { prisma }       from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

export const userRouter = Router();

const updateSchema = z.object({
  username:  z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email:     z.string().email().optional(),
  bio:       z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
});

userRouter.patch('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const body = updateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: (req as any).userId },
      data:  body,
    });
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    return res.status(500).json({ error: 'Update failed' });
  }
});

userRouter.get('/:walletAddress', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: req.params.walletAddress.toLowerCase() },
      select: {
        id: true, walletAddress: true, username: true, bio: true,
        createdAt: true,
        agents: {
          where: { status: 'ACTIVE' },
          select: {
            id: true, name: true, slug: true, category: true,
            totalCalls: true, totalRevenueUsdc: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
