import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { config } from './config.js';
import { extractionSchema } from './schema.js';

const SYSTEM_PROMPT = `You extract action items from raw meeting notes.

Rules:
- Return only real, actionable tasks. Ignore chit-chat, status updates and general discussion.
- owner: the person responsible. Use exactly "Unassigned" when the notes don't name one.
- priority: "high" if it is urgent/blocking/needs doing immediately, "low" if it is a
  nice-to-have or deferred, otherwise "medium".
- due_date: copy the deadline as written in the notes (e.g. "Friday", "tomorrow", "2026-10-20").
  Use null when no deadline is mentioned.
- Keep each task short and imperative.
- If there are no actionable tasks, return an empty tasks array.`;

// Same Zod schema that validates the response is what constrains the model.
const jsonSchema = zodToJsonSchema(extractionSchema, { target: 'openApi3' });

let client;

function getClient() {
  if (!config.groq.apiKey) {
    throw httpError('GROQ_API_KEY is not set. Add it to backend/.env', 500);
  }
  if (!client) {
    client = new Groq({ apiKey: config.groq.apiKey, timeout: config.groq.timeoutMs, maxRetries: 2 });
  }
  return client;
}

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildRequest(notes, useJsonSchema) {
  return {
    model: config.groq.model,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Meeting notes:\n\n${notes}` },
    ],
    response_format: useJsonSchema
      ? { type: 'json_schema', json_schema: { name: 'task_extraction', strict: true, schema: jsonSchema } }
      : { type: 'json_object' },
  };
}

/**
 * Calls Groq and validates the reply against the Zod schema, so the route
 * only ever receives a known-good shape.
 */
export async function extractTasks(notes) {
  const startedAt = Date.now();
  let completion;
  let mode = 'json_schema';

  console.log(`[groq] → ${config.groq.model} | ${notes.length} chars | ${mode}`);

  try {
    completion = await getClient().chat.completions.create(buildRequest(notes, true));
  } catch (error) {
    // Not every model supports json_schema; fall back to plain JSON mode.
    if (error?.status === 400) {
      mode = 'json_object';
      console.warn('[groq] json_schema rejected, retrying with json_object');
      completion = await getClient()
        .chat.completions.create(buildRequest(notes, false))
        .catch((fallbackError) => {
          throw toFriendlyError(fallbackError);
        });
    } else {
      console.error(`[groq] ✗ failed after ${Date.now() - startedAt}ms:`, error?.message);
      throw toFriendlyError(error);
    }
  }

  const usage = completion.usage;
  console.log(
    `[groq] ← ${Date.now() - startedAt}ms | ${mode} | tokens in/out: ` +
      `${usage?.prompt_tokens ?? '?'}/${usage?.completion_tokens ?? '?'}`
  );

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw httpError('The model returned an empty response. Please try again.', 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error('[groq] invalid JSON:', String(content).slice(0, 200));
    throw httpError('The model returned invalid JSON. Please try again.', 502);
  }

  const result = extractionSchema.safeParse(parsed);
  if (!result.success) {
    console.error('[groq] schema mismatch:', result.error.issues.slice(0, 3));
    throw httpError('The model response did not match the expected task schema.', 502);
  }

  console.log(`[groq] ✓ extracted ${result.data.tasks.length} task(s)`);
  return result.data.tasks;
}

function toFriendlyError(error) {
  if (error?.statusCode) return error;

  const status = error?.status;
  if (status === 401) return httpError('Invalid GROQ_API_KEY.', 502);
  if (status === 404) {
    return httpError(
      `Model "${config.groq.model}" is not available on this Groq account. Set GROQ_MODEL in backend/.env to a model you have access to.`,
      502
    );
  }
  if (status === 429) return httpError('Groq rate limit reached. Please wait and try again.', 429);
  if (error?.name === 'APIConnectionTimeoutError') {
    return httpError('The model request timed out. Please try again.', 504);
  }
  if (error?.name === 'APIConnectionError') {
    return httpError('Cannot reach Groq. Check your internet connection.', 503);
  }
  return httpError(error?.message ?? 'Task extraction failed.', 502);
}
