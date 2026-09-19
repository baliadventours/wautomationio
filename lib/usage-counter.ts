export class UsageCounter {
  private static usageStore = new Map<string, number>();

  static checkAndIncrement(tenantId: string, limit: number = 1000): { allowed: boolean; remaining: number; current: number } {
    const today = new Date().toISOString().split('T')[0];
    const key = `${tenantId}:${today}`;
    const current = UsageCounter.usageStore.get(key) || 0;

    if (current >= limit) {
      return { allowed: false, remaining: 0, current };
    }

    UsageCounter.usageStore.set(key, current + 1);
    return { allowed: true, remaining: limit - (current + 1), current: current + 1 };
  }
}
