import { PaymentProvider, PaymentCheckoutOptions, PaymentCheckoutResult } from './payment-provider';

export class XenditProvider implements PaymentProvider {
  async createCheckout(options: PaymentCheckoutOptions): Promise<PaymentCheckoutResult> {
    const invoiceId = `inv_xen_${Date.now()}`;
    return {
      paymentUrl: `https://checkout.xendit.co/web/${invoiceId}`,
      invoiceId
    };
  }

  verifyWebhook(headers: any, body: any): boolean {
    const callbackToken = headers['x-callback-token'];
    return callbackToken === (process.env.XENDIT_CALLBACK_TOKEN || 'test_token');
  }
}
