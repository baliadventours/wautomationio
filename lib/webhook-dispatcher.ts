import crypto from 'crypto';

export class WebhookDispatcher {
  static signPayload(payload: any, secret: string): string {
    const stringified = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(stringified).digest('hex');
  }

  static async dispatch(url: string, event: string, payload: any, secret: string): Promise<boolean> {
    const signature = WebhookDispatcher.signPayload(payload, secret);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wautomation-Event': event,
          'X-Wautomation-Signature': signature
        },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
