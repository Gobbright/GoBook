import { env } from '../../config/env.js';
import { httpError } from '../../utils/httpError.js';

export function metaConfig() {
  const config = env.meta;
  const origin = new URL(config.publicOrigin);
  if (origin.origin !== config.publicOrigin || origin.protocol !== 'https:') throw httpError(503, 'Meta public origin must be an HTTPS origin');
  if (env.nodeEnv === 'production' && origin.origin !== 'https://www.gobooksuite.com') throw httpError(503, 'Meta production origin must be https://www.gobooksuite.com');
  return { ...config, callbackUrl: origin.origin + '/auth/meta/callback', settingsUrl: origin.origin + '/whatsapp/settings' };
}

export function requireMetaConfig() {
  const config = metaConfig();
  if (!/^\d+$/.test(config.appId) || !config.appSecret || !/^\d+$/.test(config.configId) || !/^v\d+\.\d+$/.test(config.graphVersion) ||
      !/^[a-fA-F0-9]{64}$/.test(config.encryptionKey)) throw httpError(503, 'WhatsApp connection is not configured. Please contact support.');
  return config;
}
