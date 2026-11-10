export interface ProjectFile {
  path: string;
  content: string;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  prompt: string;
  files: ProjectFile[];
  summary: string;
}

export interface PatternFinding {
  id: string;
  rule: string;
  cwe: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  line: number;
  snippet: string;
  message: string;
  recommendation: string;
}

export interface ModelPrediction {
  riskScore: number;
  label: 'SAFE' | 'LOW_RISK' | 'HIGH_RISK';
  confidence: number;
  isAvailable: boolean;
  statusMessage?: string;
}

export interface FileScanResult {
  path: string;
  contentHash: string;
  modelPrediction: ModelPrediction;
  patternFindings: PatternFinding[];
  timestamp: string;
}

export interface ConsoleLog {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface BrandingConfig {
  appName: string;
  logoSvg?: string;
  primaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
}

export interface RunSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemInstruction: string;
}

export interface AskSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface AskMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: AskSource[];
  isStreaming?: boolean;
  searchedWeb?: boolean;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: AskMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface QuotaStats {
  requestsToday: number;
  dailyGlobalCap: number;
  remainingDailyQuota: number;
  rateLimitPerMinute: number;
}
