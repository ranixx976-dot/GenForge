import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { streamLLM, ChatMessage } from '../llm/index.js';
import { logEvent } from '../logger.js';

export const generateRouter = Router();

// Zod Schema for input
const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(10000, 'Prompt too long'),
  currentFiles: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  image: z
    .object({
      base64: z.string(),
      mimeType: z.string().optional().default('image/png'),
    })
    .optional(),
  settings: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(1).optional().default(0.4),
      maxTokens: z.number().optional().default(4096),
      systemInstruction: z.string().optional(),
    })
    .optional(),
});

// Zod Schema for expected LLM output
export const GeneratedProjectSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      })
    )
    .min(1, 'At least one file must be generated'),
  summary: z.string().min(1),
});

export type GeneratedProject = z.infer<typeof GeneratedProjectSchema>;

function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip markdown code fences if wrapped
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find outermost JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

const BUILD_SYSTEM_PROMPT = `You are GenForge Engine, an elite frontend software architect specializing in generating production-grade, highly responsive, interactive web applications.

CRITICAL OUTPUT FORMAT REQUIREMENTS:
1. You must output ONLY a valid, parseable JSON object matching this exact schema:
{
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>..."
    },
    {
      "path": "style.css",
      "content": "/* styles */"
    },
    {
      "path": "app.js",
      "content": "// interactive logic"
    }
  ],
  "summary": "Detailed summary of the application built or changes applied"
}
2. NO markdown wraps outside the JSON, NO conversational commentary before or after.
3. Every file must be self-contained and immediately runnable inside a sandboxed iframe.
4. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script> in index.html for modern, sleek layouts.
5. Provide rich interactive logic (e.g., event listeners, state updates, animations, local storage if needed).
6. Security rules: Never use eval(), avoid unsafe innerHTML where textContent works, and never inject mock API secrets into the client code.
7. If EXISTING FILES are provided in the user prompt, DO NOT throw them away! Modify and enhance the existing files precisely as requested (e.g., add dark mode, fix bug, add new feature).`;

generateRouter.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Validate input
  const parseResult = GenerateRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    logEvent({
      requestId,
      mode: 'build',
      status: 'error',
      error: 'Validation failed',
      latencyMs: Date.now() - startTime,
    });
    return res.status(400).json({
      error: 'Invalid build request',
      details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }

  const { prompt, currentFiles, image, settings } = parseResult.data;

  // Build user prompt text
  let userPrompt = prompt;
  if (currentFiles && currentFiles.length > 0) {
    userPrompt = `EXISTING PROJECT FILES (Modify or enhance these files per the request below):
${currentFiles.map((f) => `--- File: ${f.path} ---\n${f.content}\n`).join('\n')}

USER MODIFICATION REQUEST:
${prompt}

Respond with the complete, updated project JSON containing all necessary files.`;
  }

  const messages: ChatMessage[] = [
    { role: 'user', content: userPrompt },
  ];

  async function attemptGeneration(repairMessage?: string): Promise<GeneratedProject> {
    const activeMessages = repairMessage
      ? [...messages, { role: 'user' as const, content: repairMessage }]
      : messages;

    const stream = await streamLLM(activeMessages, {
      mode: 'build',
      model: settings?.model,
      temperature: settings?.temperature ?? 0.3,
      maxTokens: settings?.maxTokens ?? 4096,
      systemInstruction: settings?.systemInstruction || BUILD_SYSTEM_PROMPT,
      imageBase64: image?.base64,
      imageMimeType: image?.mimeType,
    });

    let accumulatedText = '';
    for await (const chunk of stream) {
      accumulatedText += chunk;
    }

    const parsedJson = extractJsonFromText(accumulatedText);
    const validated = GeneratedProjectSchema.parse(parsedJson);
    return validated;
  }

  try {
    let result: GeneratedProject;
    try {
      result = await attemptGeneration();
    } catch (primaryError: any) {
      console.warn(`[GenForge Auto-Repair] Primary generation failed: ${primaryError.message}. Initiating repair pass...`);
      // Automatic single retry with repair prompt
      const repairPrompt = `Your previous response did not produce valid JSON matching {"files": [...], "summary": "..."}. Please repair and output strictly pure JSON with no markdown wrapping.`;
      result = await attemptGeneration(repairPrompt);
    }

    logEvent({
      requestId,
      mode: 'build',
      status: 'success',
      latencyMs: Date.now() - startTime,
    });

    return res.json({
      success: true,
      requestId,
      files: result.files,
      summary: result.summary,
      executionMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error(`Generation error [${requestId}]:`, err);
    logEvent({
      requestId,
      mode: 'build',
      status: 'error',
      error: err.message,
      latencyMs: Date.now() - startTime,
    });

    return res.status(500).json({
      success: false,
      error: `Generation error: ${err.message || 'Failed to generate code.'}`,
      canRetry: true,
      requestId,
    });
  }
});
