import crypto from 'crypto';
import { getConfig } from '../config.js';

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
  riskScore: number; // 0.00 to 1.00
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

// In-memory content-hash cache for performance
const scanCache = new Map<string, FileScanResult>();

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Deterministic pattern cross-check for high-frequency web vulnerabilities
 */
export function runPatternChecks(path: string, content: string): PatternFinding[] {
  const findings: PatternFinding[] = [];
  const lines = content.split('\n');

  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    const trimmed = lineText.trim();

    // Skip commented lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    // 1. CWE-95: Dangerous Code Evaluation (eval, new Function)
    if (/\beval\s*\(/.test(lineText) || /new\s+Function\s*\(/.test(lineText)) {
      findings.push({
        id: `pat-eval-${lineNum}`,
        rule: 'Dynamic Code Evaluation',
        cwe: 'CWE-95',
        severity: 'CRITICAL',
        line: lineNum,
        snippet: trimmed.slice(0, 80),
        message: 'Use of eval() or Function constructor permits arbitrary script execution.',
        recommendation: 'Replace eval() with structured JSON.parse() or dedicated parser logic.',
      });
    }

    // 2. CWE-79: Unsafe DOM Sink (innerHTML, outerHTML, document.write)
    if (
      /\.innerHTML\s*=/.test(lineText) ||
      /\.outerHTML\s*=/.test(lineText) ||
      /document\.write\s*\(/.test(lineText)
    ) {
      findings.push({
        id: `pat-xss-${lineNum}`,
        rule: 'Unsanitized DOM Manipulation',
        cwe: 'CWE-79',
        severity: 'HIGH',
        line: lineNum,
        snippet: trimmed.slice(0, 80),
        message: 'Direct assignment to innerHTML can lead to Cross-Site Scripting (DOM XSS).',
        recommendation: 'Use textContent, innerText, or safe element construction with DOM APIs.',
      });
    }

    // 3. CWE-798: Hardcoded API keys or Secrets
    if (
      /(api[_-]?key|secret|token|password|auth_token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i.test(
        lineText
      )
    ) {
      findings.push({
        id: `pat-secret-${lineNum}`,
        rule: 'Hardcoded Secret / Credential',
        cwe: 'CWE-798',
        severity: 'CRITICAL',
        line: lineNum,
        snippet: trimmed.slice(0, 80),
        message: 'Hardcoded secret token detected in client-side code.',
        recommendation: 'Move credentials to environment variables on the backend proxy server.',
      });
    }

    // 4. CWE-89: SQL injection pattern in query string concatenation
    if (
      /(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\+\s*['"]?[a-zA-Z_]/i.test(lineText) ||
      /execute\s*\(\s*['"].*\+/.test(lineText)
    ) {
      findings.push({
        id: `pat-sqli-${lineNum}`,
        rule: 'SQL String Concatenation',
        cwe: 'CWE-89',
        severity: 'HIGH',
        line: lineNum,
        snippet: trimmed.slice(0, 80),
        message: 'Unparameterized query string assembly detected.',
        recommendation: 'Use parameterized queries or prepared statements.',
      });
    }

    // 5. CWE-1321: Prototype Pollution
    if (/__proto__|constructor\.prototype/.test(lineText)) {
      findings.push({
        id: `pat-proto-${lineNum}`,
        rule: 'Prototype Pollution Risk',
        cwe: 'CWE-1321',
        severity: 'MEDIUM',
        line: lineNum,
        snippet: trimmed.slice(0, 80),
        message: 'Direct property access on __proto__ or constructor prototype can corrupt object inheritance.',
        recommendation: 'Use Object.create(null) or Map data structures to isolate dynamic keys.',
      });
    }

    // 6. CWE-346: Wildcard postMessage Target Origin
    if (/postMessage\s*\([^,]+,\s*['"]\*['"]\)/.test(lineText)) {
      findings.push({
        id: `pat-postmsg-${lineNum}`,
        rule: 'Insecure postMessage Target Origin',
        cwe: 'CWE-346',
        severity: 'MEDIUM',
        line: lineNum,
        snippet: trimmed.slice(0, 80),
        message: 'postMessage with "*" target origin exposes communication to any embedding domain.',
        recommendation: 'Specify exact origin URI instead of wildcard "*".',
      });
    }
  });

  return findings;
}

/**
 * Call the FastAPI CodeBERT Scanner service (POST /scan)
 */
async function queryScannerService(path: string, content: string): Promise<ModelPrediction> {
  const config = getConfig();
  const scannerUrl = config.SCANNER_URL.replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const res = await fetch(`${scannerUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: path, content }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        riskScore: Number(data.risk_score ?? data.riskScore ?? 0.12),
        label: data.label || (data.risk_score > 0.6 ? 'HIGH_RISK' : data.risk_score > 0.25 ? 'LOW_RISK' : 'SAFE'),
        confidence: Number(data.confidence ?? 0.89),
        isAvailable: true,
      };
    }
  } catch (err) {
    // Scanner service is offline or timed out
  }

  // Graceful fallback: CodeBERT heuristic simulator if external microservice isn't running
  const patternIssues = runPatternChecks(path, content);
  const heuristicScore = patternIssues.length > 0 
    ? Math.min(0.94, 0.45 + patternIssues.length * 0.18)
    : 0.08;

  return {
    riskScore: Number(heuristicScore.toFixed(2)),
    label: heuristicScore > 0.6 ? 'HIGH_RISK' : heuristicScore > 0.25 ? 'LOW_RISK' : 'SAFE',
    confidence: 0.85,
    isAvailable: false,
    statusMessage: 'Scanner service offline (showing local model heuristic)',
  };
}

/**
 * Scan a single file producing both distinct signals
 */
export async function scanFile(path: string, content: string): Promise<FileScanResult> {
  const hash = computeHash(`${path}::${content}`);
  const cached = scanCache.get(hash);
  if (cached) {
    return cached;
  }

  const [patternFindings, modelPrediction] = await Promise.all([
    Promise.resolve(runPatternChecks(path, content)),
    queryScannerService(path, content),
  ]);

  const result: FileScanResult = {
    path,
    contentHash: hash,
    modelPrediction,
    patternFindings,
    timestamp: new Date().toISOString(),
  };

  scanCache.set(hash, result);
  return result;
}

/**
 * Scan entire project
 */
export async function scanProject(files: Array<{ path: string; content: string }>): Promise<FileScanResult[]> {
  return Promise.all(files.map((f) => scanFile(f.path, f.content)));
}
