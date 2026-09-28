import { OutputProvider } from '../../../src/sdk';

export const WebhookSink: OutputProvider = {
  name: 'webhook-output',
  version: '1.0.0',
  type: 'OUTPUT',

  initialize: async (config) => {
    if (!config?.targetUrl) {
      throw new Error('WebhookSink requires a targetUrl in config');
    }
    (this as any).targetUrl = config.targetUrl;
    (this as any).headers = config.headers || {};
  },

  forward: async (payload: any) => {
    const targetUrl = (this as any).targetUrl;
    const headers = (this as any).headers;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { success: false, response: await response.text() };
      }

      return { success: true, response: await response.json() };
    } catch (error: any) {
      return { success: false, response: error.message };
    }
  }
};
