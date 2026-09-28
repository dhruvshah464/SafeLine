export type PluginType = 
  | 'POLICY' 
  | 'PII' 
  | 'AUDIT' 
  | 'NOTIFICATION' 
  | 'VALIDATOR' 
  | 'OUTPUT';

export interface BasePlugin {
  name: string;
  version: string;
  type: PluginType;
  initialize?: (config?: any) => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  evaluate: (payload: any) => Promise<{ passed: boolean; reason?: string }>;
}

export interface PolicyProvider extends BasePlugin {
  type: 'POLICY';
  getRules: () => Promise<PolicyRule[]>;
}

export interface PiiFinding {
  type: string;
  path: string;
  value: string;
}

export interface PiiProvider extends BasePlugin {
  type: 'PII';
  detect: (payload: any) => Promise<PiiFinding[]>;
  redact: (payload: any, findings: PiiFinding[]) => Promise<any>;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  decision: 'ALLOW' | 'DENY';
  payloadHash: string;
  details: any;
}

export interface AuditProvider extends BasePlugin {
  type: 'AUDIT';
  record: (audit: AuditRecord) => Promise<void>;
}

export interface NotificationEvent {
  level: 'info' | 'warn' | 'error' | 'critical';
  title: string;
  message: string;
  data?: any;
}

export interface NotificationProvider extends BasePlugin {
  type: 'NOTIFICATION';
  send: (event: NotificationEvent) => Promise<void>;
}

export interface ValidationContext {
  payload: any;
  metadata?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ValidatorPlugin extends BasePlugin {
  type: 'VALIDATOR';
  validate: (context: ValidationContext) => Promise<ValidationResult>;
}

export interface OutputProvider extends BasePlugin {
  type: 'OUTPUT';
  forward: (payload: any) => Promise<{ success: boolean; response?: any }>;
}

export type SafeLinePlugin = 
  | PolicyProvider 
  | PiiProvider 
  | AuditProvider 
  | NotificationProvider 
  | ValidatorPlugin 
  | OutputProvider;
