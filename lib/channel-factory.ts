import { ChannelProvider } from './channel-provider';
import { BaileysProvider } from './baileys-provider';
import { CloudApiProvider } from './cloud-api-provider';

export class ChannelFactory {
  static getProvider(type: 'baileys' | 'cloud_api'): ChannelProvider {
    if (type === 'baileys') {
      return new BaileysProvider();
    }
    return new CloudApiProvider();
  }
}
