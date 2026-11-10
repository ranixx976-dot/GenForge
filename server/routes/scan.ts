import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { scanProject } from '../scanner/index.js';
import { logEvent } from '../logger.js';

export const scanRouter = Router();

const ScanRequestSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      })
    )
    .min(1, 'Must provide at least one file to scan'),
});

scanRouter.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const parseResult = ScanRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid scan payload',
      details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }

  try {
    const results = await scanProject(parseResult.data.files);

    logEvent({
      requestId,
      mode: 'scan',
      status: 'success',
      latencyMs: Date.now() - startTime,
    });

    return res.json({
      success: true,
      requestId,
      results,
      disclaimer:
        'A second opinion, not a certificate of safety. The ML model was trained on C code; JavaScript and Python predictions are unvalidated.',
      methodologyUrl: '/methodology',
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logEvent({
      requestId,
      mode: 'scan',
      status: 'error',
      error: err.message,
      latencyMs: Date.now() - startTime,
    });

    return res.status(500).json({
      error: 'Scanner failed to complete file analysis',
      message: err.message,
    });
  }
});
