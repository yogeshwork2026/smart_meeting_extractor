# Smart Meeting Extractor — Backend

Node.js + Express API that turns raw meeting notes into structured tasks using Groq, validates the
model output against a Zod schema, and saves the result to MySQL.

Frontend lives in a separate repository and talks to this API over HTTP.

## Requirements

- Node.js 18+
- MySQL 8 (optional — extraction still works if the database is down)
- A free Groq API key: https://console.groq.com/keys

## Setup

```bash
npm install
```

Create a `.env` file in this folder (shared separately, never committed):


```bash
npm run dev     # watch mode, http://localhost:4000
npm start       # plain start
```

The database and `tasks` table are created on boot, so there is no migration step.

## Files

| File        | Responsibility                                  |
| ----------- | ----------------------------------------------- |
| `server.js` | Express app, routes, error handling, boot        |
| `groq.js`   | Groq call, structured output, schema validation  |
| `schema.js` | Zod schemas (model output + request validation)  |
| `db.js`     | MySQL pool, queries, table creation              |
| `config.js` | Environment configuration                       |

## API

| Method | Route          | Description                             |
| ------ | -------------- | --------------------------------------- |
| GET    | `/api/health`  | Model, API key and database status       |
| POST   | `/api/extract` | `{ "notes": "..." }` → extracted tasks  |
| GET    | `/api/tasks`   | 50 most recent saved tasks              |

```bash
curl -X POST localhost:4000/api/extract \
  -H 'Content-Type: application/json' \
  -d '{"notes":"Priya will fix the login bug, urgent. @rahul to send the deck by Friday."}'
```

```json
{
  "persisted": true,
  "tasks": [
    { "id": 1, "task": "Fix the login bug", "owner": "Priya", "priority": "high", "due_date": null },
    { "id": 2, "task": "Send the deck", "owner": "rahul", "priority": "medium", "due_date": "Friday" }
  ]
}
```

## Model choice

`openai/gpt-oss-120b` on Groq's free tier. Groq needs no credit card and is rate limited rather
than metered, and this model was the most consistent of the ones available on the account: it
caught every action item in the test notes, skipped the small talk, and read "nice to have" as
low priority. Responses come back in roughly 1-1.5s, fast enough for a request-response UI.

Set `GROQ_MODEL` to switch models. If the configured model is not on your account, `/api/extract`
returns a 502 naming the problem instead of failing silently.

## Reliability

One Zod schema in `schema.js` drives both directions. It is converted with `zod-to-json-schema`
and sent as Groq's `json_schema` response format, so the model is constrained rather than asked
politely for JSON. The reply is then parsed back through the same schema before it reaches MySQL,
which means no markdown wrappers or malformed output can get through. Models that reject
`json_schema` fall back to `json_object` mode automatically.

Every call is logged with model, mode, latency and token usage:

```
[groq] → openai/gpt-oss-120b | 182 chars | json_schema
[groq] ← 1241ms | json_schema | tokens in/out: 210/96
[groq] ✓ extracted 4 task(s)
```

## Error handling

| Situation                  | Response                                         |
| -------------------------- | ------------------------------------------------ |
| Notes too short / missing  | 400 with per-field messages                      |
| Missing API key            | 500 with a readable message                      |
| Invalid key / unknown model| 502 naming the cause                             |
| Rate limit hit             | 429                                              |
| Timeout                    | 504 after 30s (plus 2 SDK retries)               |
| Reply fails schema check   | 502, nothing written to MySQL                    |
| MySQL down                 | 200 with `persisted: false` and a warning        |

That last row is deliberate: the expensive work already succeeded, so the tasks are returned to
the user instead of being thrown away over a database problem.

## Scaling to 1,000 concurrent users

The model call is the bottleneck, so it has to move off the request path. The API would accept
notes, push a job onto a queue (BullMQ/SQS), and return a job id immediately; workers consume the
queue at a rate that respects the provider's limits, and the client gets results over polling or
SSE. Stateless API containers sit behind a load balancer and autoscale on queue depth, MySQL moves
to a managed instance with read replicas for the list endpoint and batched inserts for writes, and
Redis caches identical note hashes so repeated pastes never hit the model twice. Per-user rate
limits plus a circuit breaker around the provider keep one slow or throttled inference from
degrading everyone, and a self-hosted model becomes the fallback once provider limits bind.
