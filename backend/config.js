import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
    timeoutMs: Number(process.env.GROQ_TIMEOUT_MS ?? 30000),
  },

  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'smart_meeting_extractor',
  },
};
