import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { TokenPayload } from '../../src/types';

dotenv.config();

import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    // Handle expired token separately to avoid noisy logs and return clear status
    if (error && (error as any).name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication token expired' });
    }

    // Handle malformed JWT or other verification errors
    if (error && (error as any).name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid authentication token' });
    }

    // Unexpected errors: log once and return generic forbidden
    console.error('Unexpected error verifying token:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Requires admin privileges' });
  }
  next();
};