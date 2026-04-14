/**
 * Auth Routes
 * Sign-In with Ethereum (SIWE) + JWT
 *
 * POST /api/v1/auth/nonce      — get a nonce to sign
 * POST /api/v1/auth/verify     — verify SIWE message, return JWT
 * POST /api/v1/auth/register   — register with email (alternative)
 * GET  /api/v1/auth/me         — get current user
 * POST /api/v1/auth/logout     — invalidate session
 */

import { Router, Request, Response } from 'express';
import { SiweMessage }  from 'siwe';
import jwt              from 'jsonwebtoken';
import { z }            from 'zod';
import { prisma }       from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

// ─── GET NONCE ───────────────────────────────────────────────────────────────
authRouter.get('/nonce', async (_req: Request, res: Response) => {
  try {
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.authNonce.create({
      data: { nonce, expiresAt },
    });

    res.json({ nonce });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// ─── VERIFY SIWE ─────────────────────────────────────────────────────────────
const verifySchema = z.object({
  message:   z.string(),
  signature: z.string(),
});

authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { message, signature } = verifySchema.parse(req.body);

    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });

    if (!fields.success) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const walletAddress = fields.data.address.toLowerCase();
    const nonce = fields.data.nonce;

    // Verify nonce exists and hasn't been used
    const storedNonce = await prisma.authNonce.findUnique({
      where: { nonce },
    });

    if (!storedNonce || storedNonce.used || storedNonce.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Mark nonce as used
    await prisma.authNonce.update({
      where: { nonce },
      data:  { used: true },
    });

    // Upsert user
    const user = await prisma.user.upsert({
      where:  { walletAddress },
      create: { walletAddress },
      update: { updatedAt: new Date() },
    });

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );

    return res.json({
      token,
      user: {
        id:            user.id,
        walletAddress: user.walletAddress,
        email:         user.email,
        username:      user.username,
        role:          user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    console.error('SIWE verify error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

// ─── REGISTER WITH EMAIL ─────────────────────────────────────────────────────
const registerSchema = z.object({
  email:         z.string().email(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, walletAddress } = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(walletAddress ? [{ walletAddress: walletAddress.toLowerCase() }] : []),
        ],
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Account already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        walletAddress: walletAddress?.toLowerCase() || `email:${email}`,
      },
    });

    const token = jwt.sign(
      { userId: user.id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── GET CURRENT USER ────────────────────────────────────────────────────────
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: {
        id:            true,
        walletAddress: true,
        email:         true,
        username:      true,
        bio:           true,
        role:          true,
        createdAt:     true,
        _count: {
          select: { agents: true, calls: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

// ─── EMAIL VERIFICATION ──────────────────────────────────────────────────────
authRouter.post('/send-verification', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    if (!user?.email) return res.status(400).json({ error: 'No email address on account' });

    const token = crypto.randomUUID().replace(/-/g, '');
    const exp   = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.authNonce.create({ data: { nonce: `verify:${token}`, expiresAt: exp } });

    try {
      const { emailService } = await import('../services/email.service');
      await emailService.sendVerificationEmail(user.email, token);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    return res.json({ message: 'Verification email sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
});

authRouter.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const stored = await prisma.authNonce.findUnique({ where: { nonce: `verify:${token}` } });
    if (!stored || stored.used || stored.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await prisma.authNonce.update({ where: { nonce: `verify:${token}` }, data: { used: true } });

    return res.json({ message: 'Email verified successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// crypto import needed
import crypto from 'crypto';
