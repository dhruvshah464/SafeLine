import { NotificationProvider, NotificationEvent } from '../../../src/sdk';

export const SlackNotifier: NotificationProvider = {
  name: 'slack-notifier',
  version: '1.0.0',
  type: 'NOTIFICATION',
  
  initialize: async (config) => {
    if (!config?.webhookUrl) {
      console.warn('Slack Notifier initialized without webhook URL. Will log to console instead.');
    }
    (this as any).webhookUrl = config?.webhookUrl;
  },

  send: async (event: NotificationEvent) => {
    const webhookUrl = (this as any).webhookUrl;
    const emoji = event.level === 'critical' ? '🚨' : event.level === 'error' ? '❌' : event.level === 'warn' ? '⚠️' : 'ℹ️';
    
    const message = {
      text: `${emoji} *${event.title}*\n${event.message}`,
      attachments: event.data ? [
        {
          color: event.level === 'critical' ? '#ff0000' : '#36a64f',
          text: `\`\`\`${JSON.stringify(event.data, null, 2)}\`\`\``
        }
      ] : []
    };

    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
      } catch (error) {
        console.error('Failed to send Slack notification:', error);
      }
    } else {
      console.log('--- SLACK MOCK ---');
      console.log(JSON.stringify(message, null, 2));
      console.log('------------------');
    }
  }
};
