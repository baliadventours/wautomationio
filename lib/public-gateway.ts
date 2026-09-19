import { Router, Request, Response } from 'express';
import { ApiKeyAuth } from './api-key-auth';
import { ChannelFactory } from './channel-factory';
import { UsageCounter } from './usage-counter';

export const publicGatewayRouter = Router();

// Middleware: Authenticate Bearer API Key
publicGatewayRouter.use((req: Request, res: Response, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header. Use Authorization: Bearer wa_live_...' }
    });
  }

  const token = authHeader.split(' ')[1];
  const hash = ApiKeyAuth.hashKey(token);

  // Attach mock tenant for authorized API key
  (req as any).tenant = {
    id: 'tenant_default',
    max_daily_messages: 1000
  };
  next();
});

// GET /v1/channels
publicGatewayRouter.get('/channels', (req: Request, res: Response) => {
  res.json({
    data: [
      {
        id: 'chan_mock_1',
        name: 'Primary Baileys',
        provider: 'baileys',
        status: 'connected',
        phone_number: '+628123456789'
      }
    ]
  });
});

// POST /v1/messages/send
publicGatewayRouter.post('/messages/send', async (req: Request, res: Response) => {
  const { channel_id, to, type = 'text', text } = req.body;
  const tenant = (req as any).tenant;

  if (!channel_id || !to) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'channel_id and to are required' } });
  }

  const quota = UsageCounter.checkAndIncrement(tenant.id, tenant.max_daily_messages);
  if (!quota.allowed) {
    return res.status(429).json({ error: { code: 'QUOTA_EXCEEDED', message: 'Daily message limit reached' } });
  }

  const provider = ChannelFactory.getProvider('baileys');
  const result = await provider.sendMessage({ to, type, text });

  return res.json({
    data: {
      id: result.messageId,
      status: result.status,
      timestamp: result.timestamp,
      remaining_daily_quota: quota.remaining
    }
  });
});
