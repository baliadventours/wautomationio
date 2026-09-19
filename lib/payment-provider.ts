export interface PaymentCheckoutOptions {
  tenantId: string;
  plan: 'starter' | 'pro' | 'enterprise';
  amount: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentCheckoutResult {
  paymentUrl: string;
  invoiceId: string;
}

export interface PaymentProvider {
  createCheckout(options: PaymentCheckoutOptions): Promise<PaymentCheckoutResult>;
  verifyWebhook(headers: any, body: any): boolean;
}
