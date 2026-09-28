export type PluginType = 
  | 'POLICY_PROVIDER'
  | 'PII_PROVIDER'
  | 'AUDIT_PROVIDER'
  | 'NOTIFICATION_PROVIDER'
  | 'VALIDATOR'
  | 'OUTPUT_PROVIDER';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  type: PluginType;
  author: string;
}

export interface BasePlugin {
  metadata: PluginMetadata;
  initialize?: (config: Record<string, any>) => Promise<void>;
  shutdown?: () => Promise<void>;
}

// 1. Policy Provider
export interface PolicyEvaluationRequest {
  payload: any;
  context: Record<string, any>;
}

export interface PolicyEvaluationResult {
  ruleId: string;
  name: string;
  passed: boolean;
  reason?: string;
  latencyMs: number;
}

export interface PolicyProviderPlugin extends BasePlugin {
  metadata: PluginMetadata & { type: 'POLICY_PROVIDER' };
  evaluate: (request: PolicyEvaluationRequest) => Promise<PolicyEvaluationResult[]>;
}

// 2. PII Provider
export interface PiiDetectionRequest {
  payload: any;
}

export interface PiiFinding {
  type: string;
  value?: string;
  path?: string;
  redactedValue?: string;
}

export interface PiiDetectionResult {
  findings: PiiFinding[];
  redactedPayload: any;
  latencyMs: number;
}

export interface PiiProviderPlugin extends BasePlugin {
  metadata: PluginMetadata & { type: 'PII_PROVIDER' };
  detectAndRedact: (request: PiiDetectionRequest) => Promise<PiiDetectionResult>;
}

// 3. Audit Provider
export interface AuditRecord {
  id: string;
  timestamp: string;
  action: string;
  payload: any;
  decision: 'ALLOW' | 'DENY';
  metadata: Record<string, any>;
}

export interface AuditProviderPlugin extends BasePlugin {
  metadata: PluginMetadata & { type: 'AUDIT_PROVIDER' };
  logRecord: (record: AuditRecord) => Promise<string>; // Returns audit hash or ID
}

// 4. Notification Provider
export interface NotificationMessage {
  level: 'info' | 'warn' | 'error' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationProviderPlugin extends BasePlugin {
  metadata: PluginMetadata & { type: 'NOTIFICATION_PROVIDER' };
  sendNotification: (notification: NotificationMessage) => Promise<void>;
}

// 5. Validator
export interface ValidationRequest {
  payload: any;
  schema?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidatorPlugin extends BasePlugin {
  metadata: PluginMetadata & { type: 'VALIDATOR' };
  validate: (request: ValidationRequest) => Promise<ValidationResult>;
}

// 6. Output Provider
export interface OutputRequest {
  payload: any;
  destination: string;
}

export interface OutputProviderPlugin extends BasePlugin {
  metadata: PluginMetadata & { type: 'OUTPUT_PROVIDER' };
  sendOutput: (request: OutputRequest) => Promise<boolean>;
}

export type SafeLinePlugin = 
  | PolicyProviderPlugin 
  | PiiProviderPlugin 
  | AuditProviderPlugin 
  | NotificationProviderPlugin 
  | ValidatorPlugin 
  | OutputProviderPlugin;
