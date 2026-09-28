import { PolicyProvider, PolicyRule } from '../../../src/sdk';

export const CustomBusinessPolicy: PolicyProvider = {
  name: 'custom-business-policy',
  version: '1.0.0',
  type: 'POLICY',
  
  initialize: async (config) => {
    console.log('Initializing Custom Business Policy Plugin with config:', config);
  },

  getRules: async (): Promise<PolicyRule[]> => {
    return [
      {
        id: 'bp-001',
        name: 'Block requests outside business hours',
        description: 'Prevents sensitive operations outside of 9 AM - 5 PM UTC',
        evaluate: async (payload: any) => {
          const currentHour = new Date().getUTCHours();
          const isBusinessHours = currentHour >= 9 && currentHour <= 17;
          
          return {
            passed: isBusinessHours,
            reason: isBusinessHours ? undefined : 'Request made outside of approved business hours.'
          };
        }
      },
      {
        id: 'bp-002',
        name: 'Require approval for large transactions',
        description: 'Any transaction over $10,000 requires explicit approval metadata',
        evaluate: async (payload: any) => {
          if (payload?.action === 'transfer' && payload?.amount > 10000) {
            const hasApproval = payload?.metadata?.approvedBy != null;
            return {
              passed: hasApproval,
              reason: hasApproval ? undefined : 'Transactions over $10,000 require approval.'
            };
          }
          return { passed: true };
        }
      }
    ];
  }
};
