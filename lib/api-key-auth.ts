import crypto from 'crypto';

export interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
}

export class ApiKeyAuth {
  static generateKey(tenantId: string, name: string): { apiKey: string; keyPrefix: string; keyHash: string } {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const apiKey = `wa_live_${randomHex}`;
    const keyPrefix = apiKey.substring(0, 16);
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    return { apiKey, keyPrefix, keyHash };
  }

  static hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
