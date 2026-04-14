import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId:        string;
  walletAddress: string;
  iat:           number;
  exp:           number;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    (req as any).userId        = payload.userId;
    (req as any).walletAddress = payload.walletAddress;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(
        authHeader.split(' ')[1],
        process.env.JWT_SECRET!
      ) as JWTPayload;
      (req as any).userId        = payload.userId;
      (req as any).walletAddress = payload.walletAddress;
    } catch {
      // ignore — optional auth
    }
  }
  next();
}
