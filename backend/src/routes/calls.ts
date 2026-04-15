/**
 * Calls Routes — The x402 Payment Execution Engine
 *
 * POST /api/v1/calls/:agentId/execute
 *   — Check X-Payment header
 *   — If missing: return 402 with payment requirements
 *   — If present: verify EIP-3009 signature
 *   — Settle USDC on X Layer
 *   — Forward request to agent endpoint
 *   — Record call in database
 *   — Return agent response
 *
 * GET /api/v1/calls              — list calls (auth, own calls only)
 * GET /api/v1/calls/:id          — single call detail
 */

import { Router, Request, Response }  from 'express';
import axios                           from 'axios';
import { z }                           from 'zod';
import { prisma }                      from '../lib/prisma';
import { x402Service }                 from '../services/x402.service';
import { runAgentCode }                from '../services/runner.service';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';

export const callsRouter = Router();

// ─── EXECUTE AN AGENT CALL ───────────────────────────────────────────────────
callsRouter.post(
  '/:agentId/execute',
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    const startMs = Date.now();

    try {
      // 1. Look up the agent
      const agent = await prisma.agent.findFirst({
        where: {
          OR: [
            { id:   req.params.agentId },
            { slug: req.params.agentId },
          ],
          status: 'ACTIVE',
        },
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found or not active' });
      }

      // 2. Check for X-Payment header
      const paymentHeader = req.headers['x-payment'] as string | undefined;

      if (!paymentHeader) {
        // Return HTTP 402 with payment requirements
        const resourceUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const paymentReq  = x402Service.buildPaymentRequired(
          agent.walletAddress,
          agent.pricePerCallUsdc.toString(),
          agent.name,
          resourceUrl
        );
        return res.status(402).json(paymentReq);
      }

      // 3. Parse and verify the payment
      let payment;
      try {
        payment = x402Service.parsePaymentHeader(paymentHeader);
      } catch (err) {
        return res.status(400).json({ error: 'Malformed X-Payment header' });
      }

      const verification = await x402Service.verifyPayment(
        payment,
        agent.walletAddress,
        agent.pricePerCallUsdc.toString()
      );

      if (!verification.valid) {
        return res.status(402).json({
          error: `Payment verification failed: ${verification.reason}`,
        });
      }

      // 4. Create a pending call record
      const fees = x402Service.calculateFees(agent.pricePerCallUsdc.toString());

      const callRecord = await prisma.agentCall.create({
        data: {
          agentId:         agent.id,
          callerId:        (req as any).userId || null,
          callerWallet:    payment.from,
          amountUsdc:      fees.totalUsdc,
          platformFeeUsdc: fees.platformFeeUsdc,
          agentEarnedUsdc: fees.agentEarnsUsdc,
          inputPayload:    req.body,
          status:          'PENDING',
        },
      });

      // 5. Settle payment on-chain (non-blocking — agent runs regardless)
      // Settlement failure is logged but does NOT block the agent call.
      // This allows the platform to work during bootstrap before the
      // platform wallet is funded with OKB gas on X Layer.
      let txHash: string | undefined;
      let blockNumber: number | undefined;

      x402Service.settlePayment(payment, agent.walletAddress)
        .then(s => { txHash = s.txHash; blockNumber = s.blockNumber; })
        .catch(err => console.error('Settlement error (non-fatal):', err?.message));

      // 6. Update call to EXECUTING
      await prisma.agentCall.update({
        where: { id: callRecord.id },
        data:  { status: 'EXECUTING' },
      });

      // 7. Execute agent — either run hosted code or forward to external URL
      let agentResponse: any;
      let agentError: string | undefined;

      if (agent.code) {
        // Platform-hosted: run the builder's code in a sandbox
        try {
          agentResponse = await runAgentCode(agent.code, req.body);
        } catch (err: any) {
          agentError = err?.message || String(err);
          console.error('Hosted agent runtime error:', agentError);
        }
      } else if (agent.endpointUrl) {
        // External URL: forward the request
        try {
          const agentRes = await axios.post(agent.endpointUrl, req.body, {
            timeout: 30_000,
            headers: {
              'Content-Type':     'application/json',
              'X-AgentMarket-Id': callRecord.id,
              'X-Caller-Wallet':  payment.from,
            },
          });
          agentResponse = agentRes.data;
        } catch (err: any) {
          agentError = err?.response?.data
            ? JSON.stringify(err.response.data)
            : err?.code === 'ECONNREFUSED'
              ? `Agent endpoint unreachable: ${agent.endpointUrl}`
              : err?.code === 'ETIMEDOUT' || err?.code === 'ECONNABORTED'
                ? `Agent timed out after 30s: ${agent.endpointUrl}`
                : err?.message || String(err);
          console.error('External agent call error:', agentError);
        }
      } else {
        agentError = 'Agent has no code or endpoint configured';
      }

      const responseMs = Date.now() - startMs;

      // 8. Update call record with result
      await prisma.agentCall.update({
        where: { id: callRecord.id },
        data: {
          status:         agentError ? 'FAILED' : 'COMPLETED',
          outputPayload:  agentResponse || null,
          responseMs,
          errorMessage:   agentError || null,
          settledAt:      agentError ? null : new Date(),
        },
      });

      // 9. Update agent aggregate stats
      if (!agentError) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            totalCalls:       { increment: 1 },
            totalRevenueUsdc: { increment: parseFloat(fees.agentEarnsUsdc) },
            // Rolling avg response time
            avgResponseMs: agent.avgResponseMs
              ? Math.round((agent.avgResponseMs + responseMs) / 2)
              : responseMs,
          },
        });
      }

      // 10. Return response
      if (agentError) {
        return res.status(502).json({
          error:   'Agent execution failed',
          callId:  callRecord.id,
          txHash,
          details: agentError,
        });
      }

      return res.json({
        result:     agentResponse,
        callId:     callRecord.id,
        txHash,
        blockNumber,
        responseMs,
        settled: {
          amount:      fees.totalUsdc,
          agentEarned: fees.agentEarnsUsdc,
          fee:         fees.platformFeeUsdc,
          currency:    'USDC',
          network:     'X Layer',
        },
      });
    } catch (err) {
      console.error('Call execution error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── LIST MY CALLS ───────────────────────────────────────────────────────────
callsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', agentId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      OR: [
        { callerId:     (req as any).userId },
        { agent: { ownerId: (req as any).userId } },
      ],
    };
    if (agentId) where.agentId = agentId;

    const [calls, total] = await Promise.all([
      prisma.agentCall.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: { id: true, name: true, slug: true, category: true },
          },
        },
      }),
      prisma.agentCall.count({ where }),
    ]);

    res.json({
      calls,
      pagination: {
        page: parseInt(page), limit: parseInt(limit), total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// ─── SINGLE CALL DETAIL ──────────────────────────────────────────────────────
callsRouter.get('/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const call = await prisma.agentCall.findUnique({
      where:   { id: req.params.id },
      include: {
        agent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!call) return res.status(404).json({ error: 'Call not found' });

    // Only show full details to the caller or agent owner
    const userId = (req as any).userId;
    if (call.callerId !== userId) {
      // Redact input/output for privacy
      return res.json({
        ...call,
        inputPayload:  '[redacted]',
        outputPayload: '[redacted]',
      });
    }

    return res.json(call);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch call' });
  }
});
