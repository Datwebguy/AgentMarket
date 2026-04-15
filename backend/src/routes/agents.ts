/**
 * Agents Routes
 *
 * GET    /api/v1/agents              — list agents (filterable)
 * GET    /api/v1/agents/:slug        — single agent detail
 * POST   /api/v1/agents              — deploy new agent (auth required)
 * PATCH  /api/v1/agents/:id          — update agent (owner only)
 * DELETE /api/v1/agents/:id          — remove agent (owner only)
 * GET    /api/v1/agents/:id/stats    — agent stats + call history
 */

import { Router, Request, Response } from 'express';
import { z }            from 'zod';
import { prisma }       from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { optionalAuthenticate } from '../middleware/authenticate';
import { walletService } from '../services/wallet.service';

export const agentsRouter = Router();

// ─── LIST AGENTS ─────────────────────────────────────────────────────────────
agentsRouter.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      sort = 'totalCalls',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { status: 'ACTIVE' };
    if (category)  where.category = category.toUpperCase();
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const validSort: Record<string, string> = {
      totalCalls:       'totalCalls',
      totalRevenue:     'totalRevenueUsdc',
      pricePerCall:     'pricePerCallUsdc',
      avgResponseMs:    'avgResponseMs',
      createdAt:        'createdAt',
    };

    const orderBy = { [validSort[sort] || 'totalCalls']: order };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        select: {
          id:               true,
          name:             true,
          slug:             true,
          description:      true,
          category:         true,
          pricePerCallUsdc: true,
          totalCalls:       true,
          totalRevenueUsdc: true,
          avgResponseMs:    true,
          uptimePct:        true,
          tags:             true,
          isVerified:       true,
          createdAt:        true,
          owner: {
            select: { id: true, walletAddress: true, username: true },
          },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.agent.count({ where }),
    ]);

    res.json({
      agents,
      pagination: {
        page:       parseInt(page),
        limit:      parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('LIST AGENTS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch agents', detail: (err as Error).message });
  }
});

// ─── GET SINGLE AGENT ────────────────────────────────────────────────────────
agentsRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: {
          select: { id: true, walletAddress: true, username: true },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { calls: true, reviews: true } },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get recent call volume for chart (last 7 days)
    const callsByDay = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        COUNT(*)::int AS calls,
        COALESCE(SUM(amount_usdc), 0)::float AS volume
      FROM agent_calls
      WHERE agent_id = ${agent.id}
        AND created_at > NOW() - INTERVAL '7 days'
        AND status = 'COMPLETED'
      GROUP BY 1
      ORDER BY 1
    `;

    return res.json({ agent, callsByDay });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// ─── DEPLOY NEW AGENT ────────────────────────────────────────────────────────
const deploySchema = z.object({
  name:        z.string().min(3).max(80),
  description: z.string().min(20).max(1000),
  category:    z.enum(['DEFI','RISK','TRADING','INTELLIGENCE','PAYMENTS','INFRASTRUCTURE','OTHER']),
  endpointUrl: z.string().url(),
  pricePerCallUsdc: z.number().min(0.0001).max(100),
  tags:        z.array(z.string()).max(5).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});

agentsRouter.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const body = deploySchema.parse(req.body);
    const ownerId = (req as any).userId;

    // Generate unique slug
    let slug = slugify(body.name, { lower: true, strict: true });
    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Provision OKX TEE Agentic Wallet for this agent
    const agentWallet = await walletService.createAgentWallet(slug);

    // Create agent in DB
    const agent = await prisma.agent.create({
      data: {
        ownerId,
        name:             body.name,
        slug,
        description:      body.description,
        category:         body.category,
        endpointUrl:      body.endpointUrl,
        pricePerCallUsdc: body.pricePerCallUsdc,
        walletAddress:    agentWallet.address,
        tags:             body.tags || [],
        inputSchema:      body.inputSchema as any,
        outputSchema:     body.outputSchema as any,
        status:           'ACTIVE', // Auto-activate for now
      },
    });

    res.status(201).json({
      agent,
      wallet: {
        address:    agentWallet.address,
        privateKey: agentWallet.privateKey, // Return ONCE — builder must save this
      },
      message: 'Agent deployed. Save your wallet private key — it will not be shown again.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Deploy error:', err);
    return res.status(500).json({ error: 'Failed to deploy agent' });
  }
});

// ─── UPDATE AGENT ────────────────────────────────────────────────────────────
const updateSchema = deploySchema.partial();

agentsRouter.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.ownerId !== (req as any).userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const body = updateSchema.parse(req.body);
    const { inputSchema, outputSchema, ...rest } = body;
    const updated = await prisma.agent.update({
      where: { id: req.params.id },
      data:  {
        ...rest,
        ...(inputSchema  !== undefined && { inputSchema:  inputSchema  as any }),
        ...(outputSchema !== undefined && { outputSchema: outputSchema as any }),
      },
    });

    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    return res.status(500).json({ error: 'Failed to update agent' });
  }
});

// ─── AGENT STATS ─────────────────────────────────────────────────────────────
agentsRouter.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, totalCalls: true, totalRevenueUsdc: true,
        avgResponseMs: true, uptimePct: true,
      },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const recentCalls = await prisma.agentCall.findMany({
      where:   { agentId: req.params.id },
      take:    20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, amountUsdc: true,
        responseMs: true, txHash: true, createdAt: true,
      },
    });

    return res.json({ ...agent, recentCalls });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// slugify helper inline (avoid extra dep import issue)
function slugify(str: string, opts: { lower?: boolean; strict?: boolean }): string {
  let s = opts.lower ? str.toLowerCase() : str;
  if (opts.strict) s = s.replace(/[^a-z0-9\s-]/g, '');
  return s.trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}
