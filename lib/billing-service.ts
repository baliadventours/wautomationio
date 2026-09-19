import { XenditProvider } from './xendit-provider';
import { StripeProvider } from './stripe-provider';

export class BillingService {
  private xendit = new XenditProvider();
  private stripe = new StripeProvider();

  async createPlanCheckout(tenantId: string, plan: 'starter' | 'pro' | 'enterprise', provider: 'xendit' | 'stripe') {
    const prices = {
      starter: { amount: 290000, currency: 'IDR' },
      pro: { amount: 790000, currency: 'IDR' },
      enterprise: { amount: 1990000, currency: 'IDR' }
    };

    const targetProvider = provider === 'xendit' ? this.xendit : this.stripe;
    return targetProvider.createCheckout({
      tenantId,
      plan,
      amount: prices[plan].amount,
      currency: prices[plan].currency,
      customerEmail: 'billing@tenant.com',
      successUrl: 'https://app.wautomation.io/dashboard?payment=success',
      cancelUrl: 'https://app.wautomation.io/dashboard?payment=cancel'
    });
  }
}
