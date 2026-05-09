import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { supabase } from './db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      apiKeyUser?: {
        id: string;
      }
    }
  }
}

export async function checkAndAutoRenewSubscription(userId: string) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!sub) return false;

  const now = new Date();
  const expiresAt = new Date(sub.expires_at);

  if (expiresAt < now) {
    if (sub.auto_renew) {
      // Calculate typical 1 month cost for current wallets
      const cost = sub.max_wallets * 0.50;
      if (sub.current_balance >= cost) {
        const newExpiresAt = new Date();
        newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
        
        await supabase
          .from('subscriptions')
          .update({
            current_balance: Number(sub.current_balance) - cost,
            expires_at: newExpiresAt.toISOString(),
            status: 'active'
          })
          .eq('id', sub.id);
        
        return true;
      } else {
        // Not enough balance to auto renew, disable it
        await supabase.from('subscriptions').update({ auto_renew: false, status: 'expired' }).eq('id', sub.id);
        return false;
      }
    } else {
      await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      return false;
    }
  }

  return true;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = user as { id: string; email: string };
    next();
  });
};

const loginAttempts = new Map<string, { count: number, resetAt: number }>();
export const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && record.resetAt > now) {
    if (record.count >= 5) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again in 1 minute.' });
    }
    record.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 }); // 1 min
  }
  next();
};

const depositAttempts = new Map<string, { count: number, resetAt: number }>();
export const depositRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.ip || 'unknown';
  const now = Date.now();
  const record = depositAttempts.get(userId as string);
  if (record && record.resetAt > now) {
    if (record.count >= 3) {
      return res.status(429).json({ error: 'Too many deposit requests. Please try again in 10 minutes.' });
    }
    record.count++;
  } else {
    depositAttempts.set(userId as string, { count: 1, resetAt: now + 600000 }); // 10 mins
  }
  next();
};

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.apiKeyUser?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const isActive = await checkAndAutoRenewSubscription(userId);
  if (!isActive) {
    return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED', message: 'Your subscription has expired. Please renew.' });
  }

  next();
};

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'] as string;
  
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (xApiKey) {
    token = xApiKey;
  }

  if (!token) {
    res.status(401).json({ error: 'MISSING_API_KEY', message: 'API key is missing' });
    return;
  }

  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    res.status(401).json({ error: 'INVALID_API_KEY', message: 'API key is invalid' });
    return;
  }

  // Check subscription
  const isActive = await checkAndAutoRenewSubscription(data.user_id);

  if (!isActive) {
    res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED', message: 'Your subscription has expired. Please renew.' });
    return;
  }

  req.apiKeyUser = { id: data.user_id };

  // Update last used
  await supabase.from('api_keys').update({ last_used_at: new Date() }).eq('key_hash', keyHash);

  next();
};
