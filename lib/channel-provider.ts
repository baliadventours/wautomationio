// Generic Channel Provider Interface
export interface ChannelCredentials {
  [key: string]: any;
}

export interface SendMessageOptions {
  to: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  text?: string;
  mediaUrl?: string;
  caption?: string;
}

export interface SendMessageResult {
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: number;
}

export interface ChannelProvider {
  initialize(channelId: string, credentials?: ChannelCredentials): Promise<void>;
  connect(): Promise<{ status: string; qr?: string }>;
  disconnect(): Promise<void>;
  getStatus(): Promise<'disconnected' | 'connecting' | 'connected' | 'banned'>;
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
}
