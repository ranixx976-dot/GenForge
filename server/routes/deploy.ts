import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getConfig } from '../config.js';
import { logEvent } from '../logger.js';

export const deployRouter = Router();

const DeployRequestSchema = z.object({
  projectName: z.string().min(1).default('genforge-project'),
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .min(1),
  vercelToken: z.string().optional(),
});

deployRouter.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `dep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const parseResult = DeployRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid deployment payload' });
  }

  const { projectName, files, vercelToken } = parseResult.data;
  const config = getConfig();
  const token = vercelToken || config.VERCEL_TOKEN;

  if (!token) {
    return res.json({
      success: false,
      requiresToken: true,
      message:
        'No Vercel Token configured. You can either enter a Vercel Personal Access Token or download the project ZIP for manual deployment.',
    });
  }

  try {
    // Format files for Vercel deployment API
    const vercelFiles = files.map((f) => ({
      file: f.path,
      data: Buffer.from(f.content).toString('base64'),
      encoding: 'base64',
    }));

    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        files: vercelFiles,
        projectSettings: {
          framework: null,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Vercel API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    logEvent({
      requestId,
      mode: 'deploy',
      status: 'success',
      latencyMs: Date.now() - startTime,
    });

    return res.json({
      success: true,
      deploymentUrl: `https://${data.url}`,
      dashboardUrl: data.inspectorUrl,
      id: data.id,
      readyState: data.readyState,
    });
  } catch (err: any) {
    logEvent({
      requestId,
      mode: 'deploy',
      status: 'error',
      error: err.message,
      latencyMs: Date.now() - startTime,
    });

    return res.status(500).json({
      success: false,
      error: `Deployment failed: ${err.message}`,
    });
  }
});
