import { QrCodeData } from '../src/types';

export class EvolutionApiClient {
  private baseUrl: string;
  private adminApiKey: string;

  constructor(baseUrl?: string, adminApiKey?: string) {
    this.baseUrl = (
      baseUrl ||
      process.env.EVOLUTION_API_BASE_URL ||
      process.env.EVOLUTION_API_URL ||
      process.env.EVOLUTION_SERVER_URL ||
      'http://127.0.0.1:8085'
    ).replace(/\/$/, '');
    this.adminApiKey =
      adminApiKey ||
      process.env.EVOLUTION_API_ADMIN_KEY ||
      process.env.EVOLUTION_API_KEY ||
      '429683C4C977415CAAFCCE10F7D57E11';
  }

  public setConfig(baseUrl: string, adminApiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.adminApiKey = adminApiKey;
  }

  public isConfigured(): boolean {
    return Boolean(this.baseUrl && this.adminApiKey);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private getHeaders(customToken?: string) {
    return {
      'Content-Type': 'application/json',
      'apikey': customToken || this.adminApiKey,
    };
  }

  /**
   * Check connection to Evolution API
   */
  async checkHealth(): Promise<{ ok: boolean; message: string; version?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, message: 'Evolution API Base URL or Admin Key is not configured in .env' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        return { ok: false, message: `Evolution API returned status ${res.status}: ${res.statusText}` };
      }

      const data = await res.json().catch(() => ({}));
      return { ok: true, message: 'Connected to Evolution API', version: data?.version || 'v1/v2' };
    } catch (err: any) {
      return { ok: false, message: `Could not reach Evolution API at ${this.baseUrl}: ${err.message}` };
    }
  }

  /**
   * GET /instance/fetchInstances
   */
  async fetchInstances(): Promise<{ success: boolean; instances?: any[]; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Evolution API is not configured' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }

      const data = await res.json();
      const instances = Array.isArray(data) ? data : data?.instances || [];
      return { success: true, instances };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * POST /instance/create
   */
  async createInstance(params: {
    instanceName: string;
    token: string;
    webhookUrl?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isConfigured()) {
      // Return simulated success for preview if not configured
      return {
        success: true,
        data: {
          instance: {
            instanceName: params.instanceName,
            status: 'created',
          },
          hash: { apikey: params.token },
        },
      };
    }

    try {
      // Clean, standard instance create payload compatible with Evolution API v1 & v2
      const payload: Record<string, any> = {
        instanceName: params.instanceName,
        token: params.token,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      };

      const res = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = Array.isArray(data?.response?.message)
          ? data.response.message.join(', ')
          : typeof data?.response?.message === 'string'
          ? data.response.message
          : data?.message || data?.error || `HTTP ${res.status}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      // If webhook is provided, configure it separately so it works seamlessly on v1 and v2
      if (params.webhookUrl) {
        try {
          await fetch(`${this.baseUrl}/webhook/set/${params.instanceName}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              enabled: true,
              url: params.webhookUrl,
              webhookByEvents: false,
              events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'QRCODE_UPDATED'],
            }),
          });
        } catch (_) {
          // Webhook setting is non-blocking
        }
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GET /instance/connect/{instanceName}
   * If phoneNumber is provided, requests an 8-character Pairing Code for linking without QR
   */
  async getConnectQr(
    instanceName: string,
    phoneNumber?: string
  ): Promise<{ success: boolean; qr?: QrCodeData; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Evolution API server URL is not configured.',
      };
    }

    const cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    const encodedInstance = encodeURIComponent(instanceName);
    const connectUrl = cleanNumber
      ? `${this.baseUrl}/instance/connect/${encodedInstance}?number=${cleanNumber}`
      : `${this.baseUrl}/instance/connect/${encodedInstance}`;

    try {
      let res = await fetch(connectUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      // If instance doesn't exist yet on Evolution API, create it and retry
      if (res.status === 404) {
        await this.createInstance({
          instanceName,
          token: `tok_${instanceName}`,
        });
        res = await fetch(connectUrl, {
          method: 'GET',
          headers: this.getHeaders(),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.response?.message?.[0] || data?.message || `HTTP ${res.status}`,
        };
      }

      let pairingCode = (data?.pairingCode && String(data.pairingCode).length <= 12)
        ? String(data.pairingCode).trim()
        : (data?.code && /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(String(data.code).trim()))
        ? String(data.code).trim()
        : undefined;

      // If a pairing code was requested with a phone number, but the socket was previously in QR mode,
      // restart the instance so Baileys can transition to pairing code mode, then query once more.
      if (cleanNumber && !pairingCode) {
        try {
          await fetch(`${this.baseUrl}/instance/restart/${encodedInstance}`, {
            method: 'POST',
            headers: this.getHeaders(),
          });
          await new Promise((r) => setTimeout(r, 1500));
          const retryRes = await fetch(connectUrl, {
            method: 'GET',
            headers: this.getHeaders(),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData?.pairingCode && String(retryData.pairingCode).length <= 12) {
              pairingCode = String(retryData.pairingCode).trim();
            }
            if (retryData?.code) data.code = retryData.code;
            if (retryData?.base64) data.base64 = retryData.base64;
          }
        } catch (_) {
          // ignore restart error
        }
      }

      return {
        success: true,
        qr: {
          pairingCode,
          code: data?.code,
          base64: data?.base64,
          count: data?.count,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Cannot reach Evolution API' };
    }
  }

  /**
   * GET /instance/connectionState/{instanceName}
   */
  async getConnectionState(instanceName: string): Promise<{
    state: 'open' | 'connecting' | 'close' | 'refused' | 'unreachable';
    phone?: string;
  }> {
    if (!this.isConfigured()) {
      return { state: 'connecting' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        return { state: 'close' };
      }

      const data = await res.json();
      const state = data?.instance?.state || data?.state || 'close';
      return {
        state: state === 'open' ? 'open' : state === 'connecting' ? 'connecting' : 'close',
        phone: data?.instance?.owner || data?.owner,
      };
    } catch {
      return { state: 'unreachable' };
    }
  }

  /**
   * POST /instance/logout/{instanceName}
   */
  async logoutInstance(instanceName: string): Promise<boolean> {
    if (!this.isConfigured()) return true;

    try {
      const res = await fetch(`${this.baseUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * DELETE /instance/delete/{instanceName}
   */
  async deleteInstance(instanceName: string): Promise<boolean> {
    if (!this.isConfigured()) return true;

    try {
      const res = await fetch(`${this.baseUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * POST /message/sendText/{instanceName}
   */
  async sendTextMessage(
    instanceName: string,
    toNumber: string,
    text: string,
    instanceToken?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Sanitize phone number (strip spaces, dashes, + signs)
    const sanitizedNumber = toNumber.replace(/\D/g, '');

    if (!this.isConfigured()) {
      // Mock successful send for test drive
      return {
        success: true,
        data: {
          key: { id: `SIM_${Date.now()}` },
          message: { conversation: text },
          messageTimestamp: Math.floor(Date.now() / 1000),
          status: 'SERVER_ACK',
        },
      };
    }

    try {
      const payload = {
        number: sanitizedNumber,
        text: text,
        textMessage: {
          text: text,
        },
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: true,
        },
      };

      const res = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(instanceToken),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.response?.message?.[0] || data?.message || `HTTP ${res.status}`,
        };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const evolutionApi = new EvolutionApiClient();
