import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const ConfigSchema = z.object({
  GEMINI_API_KEY: z.string().optional().default(''),
  LLM_BASE_URL: z.string().optional().default(''),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().default('gemini-3.8-flash'),
  LLM_MODEL_BUILD: z.string().default('gemini-3.8-flash'),
  LLM_MODEL_ASK: z.string().default('gemini-3.8-flash'),
  SCANNER_URL: z.string().default(process.env.SCANNER_URL || 'http://localhost:8000'),
  SEARCH_PROVIDER: z.enum(['gemini_grounding', 'duckduckgo', 'none']).default('gemini_grounding'),
  SEARCH_API_KEY: z.string().optional().default(''),
  VERCEL_TOKEN: z.string().optional().default(''),
  PORT: z.coerce.number().default(3000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(30),
  DAILY_GLOBAL_CAP: z.coerce.number().default(500),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
    });
    throw new Error('Configuration validation failed. Check your environment variables.');
  }

  // Ensure at least one LLM key is configured
  const cfg = result.data;
  const hasGeminiKey = Boolean(cfg.GEMINI_API_KEY && cfg.GEMINI_API_KEY !== 'your-gemini-api-key');
  const hasLlmKey = Boolean(cfg.LLM_API_KEY);

  if (!hasGeminiKey && !hasLlmKey) {
    console.warn(
      '⚠️ [GenForge Config Warning] No active GEMINI_API_KEY or LLM_API_KEY found. AI calls will use smart fallback mode until configured in Secrets.'
    );
  }

  cachedConfig = cfg;
  return cfg;
}
