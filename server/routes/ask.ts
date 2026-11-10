import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { streamLLM, ChatMessage } from '../llm/index.js';
import { performWebSearch } from '../search/index.js';
import { logEvent } from '../logger.js';

export const askRouter = Router();

const AskRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(4000, 'Message cannot exceed 4000 characters'),
      })
    )
    .min(1, 'At least one message is required')
    .max(20, 'Conversation history cannot exceed 20 messages')
    .refine((msgs) => msgs[msgs.length - 1].role === 'user', {
      message: 'The final message in the conversation must be from the user',
    }),
  enableSearch: z.boolean().optional().default(false),
  model: z.string().optional(),
});

const ASK_SYSTEM_PROMPT = `You are GenForge Ask AI, a deeply knowledgeable, objective, and accurate research assistant.
Strict Behavioral Guidelines:
1. Provide concise, direct, and factually accurate answers. Use markdown formatting (headers, bullet points, clean code blocks).
2. If you are unsure or do not have verifiable information, explicitly state: "I don't know" or "I cannot verify this with certainty."
3. Acknowledge that your cutoff knowledge may be out of date for rapidly evolving events unless verified by search context.
4. Never hallucinate, fabricate, or invent citations, papers, or URLs.
5. Medical, Legal & Financial Queries: Provide general informational summaries only. Always conclude with an explicit disclaimer:
   "⚠️ Disclaimer: This information is for general educational purposes only and does not constitute professional medical, legal, or financial advice."
6. Decline clearly harmful, abusive, or dangerous requests politely and neutrally.`;

askRouter.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `ask-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Validate request body
  const parseResult = AskRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    logEvent({
      requestId,
      mode: 'ask',
      status: 'error',
      error: 'Validation failed',
      latencyMs: Date.now() - startTime,
    });
    return res.status(400).json({
      error: 'Invalid request payload',
      details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }

  const { messages, enableSearch, model } = parseResult.data;
  const lastUserMsg = messages[messages.length - 1].content;

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let sources: Array<{ title: string; url: string; snippet?: string }> = [];
  let searchedWeb = false;

  // Decide whether web search is needed
  const needsSearch =
    enableSearch ||
    /\b(who is currently|latest|news|price of|weather in|today|current release|stock price|scores|2025|2026)\b/i.test(
      lastUserMsg
    );

  if (needsSearch) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Searching the web...' })}\n\n`);
      const searchRes = await performWebSearch(lastUserMsg);
      if (searchRes.results.length > 0) {
        searchedWeb = true;
        sources = searchRes.results.slice(0, 5);
        res.write(
          `data: ${JSON.stringify({
            type: 'search_completed',
            provider: searchRes.provider,
            sources,
          })}\n\n`
        );
      }
    } catch {
      res.write(
        `data: ${JSON.stringify({
          type: 'warning',
          message: 'Web search encountered a temporary network issue; answering with offline knowledge.',
        })}\n\n`
      );
    }
  }

  // Build messages with search grounding context if available
  const contextMessages: ChatMessage[] = [...messages];
  if (searchedWeb && sources.length > 0) {
    const citationsContext = sources
      .map((s, idx) => `[Source ${idx + 1}]: "${s.title}" (${s.url})\nSnippet: ${s.snippet || ''}`)
      .join('\n\n');

    contextMessages.splice(contextMessages.length - 1, 0, {
      role: 'system',
      content: `Here are real-time search results retrieved for the user's inquiry:\n${citationsContext}\nCite these using [1], [2], etc., where applicable. Do not invent other citations.`,
    });
  }

  try {
    const stream = await streamLLM(contextMessages, {
      mode: 'ask',
      model,
      systemInstruction: ASK_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        searchedWeb,
        sources,
      })}\n\n`
    );
    res.end();

    logEvent({
      requestId,
      mode: 'ask',
      status: 'success',
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error(`Ask mode streaming failed [${requestId}]:`, err);
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: err.message || 'LLM streaming failed. Please retry.',
      })}\n\n`
    );
    res.end();

    logEvent({
      requestId,
      mode: 'ask',
      status: 'error',
      error: err.message,
      latencyMs: Date.now() - startTime,
    });
  }
});
