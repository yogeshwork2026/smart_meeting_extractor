# Smart Meeting Extractor

Paste raw, unstructured meeting notes and get back structured, actionable tasks rendered as cards.
A language model does the parsing, a Zod schema keeps the output strict, and the extracted tasks
are saved to MySQL.

```
.
├── frontend/   Next.js 14 (App Router, TypeScript) UI
└── backend/    Node.js + Express API, Groq, MySQL
```

Each folder is a standalone project with its own README, dependencies and git repository:

- [`backend/README.md`](backend/README.md) — API, model choice, reliability, error handling, scaling
- [`frontend/README.md`](frontend/README.md) — UI structure, states, component layout

## How it works

```
textarea → POST /api/extract → Groq (json_schema) → Zod validation → MySQL → task cards
```

The browser posts raw notes to the API. The API sends them to the model with a JSON schema
generated from the Zod schema, so the reply is constrained rather than politely requested. The
response is parsed back through that same schema before anything touches the database, then
returned to the UI and rendered as cards showing task, owner, priority and due date.

## Run locally

Two terminals, backend first.

```bash
# terminal 1
cd backend
npm install
npm run dev          # http://localhost:4000

# terminal 2
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Open http://localhost:3000, click **Load sample**, then **Submit**.

Both folders need an environment file, shared separately and never committed:

| File                   | Keys                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `backend/.env`         | `GROQ_API_KEY`, `GROQ_MODEL`, `DB_*`, `PORT`, `CORS_ORIGIN`  |
| `frontend/.env.local`  | `NEXT_PUBLIC_API_BASE_URL`                                   |

MySQL is optional for a first run. If it is down, tasks are still extracted and returned with a
warning instead of a failed request. The database and `tasks` table are created on server boot, so
there is no migration step.

Use `npm run dev` for local work. `npm start` on the frontend serves a production build and needs
`npm run build` first.

## Example

Input:

```
Standup notes - 13 Oct
Priya will fix the login redirect bug, it is urgent and blocks release.
@rahul to prepare the Q4 budget deck by Friday.
Discussed moving analytics to BigQuery, nice to have for next quarter.
Sara needs to review the API contract by tomorrow.
```

Output:

| Priority | Task                       | Owner      | Due      |
| -------- | -------------------------- | ---------- | -------- |
| HIGH     | Fix the login redirect bug | Priya      | —        |
| MEDIUM   | Prepare the Q4 budget deck | Rahul      | Friday   |
| LOW      | Move analytics to BigQuery | Unassigned | —        |
| HIGH     | Review the API contract    | Sara       | tomorrow |

The model reads "urgent and blocks release" as high priority, "nice to have" as low, and leaves
the unowned item as `Unassigned`. Lines that are discussion rather than action items are skipped.

## Model

Extraction runs on **Groq** with `openai/gpt-oss-120b`, on the free developer tier (no credit
card, rate limited rather than metered). Typical extraction takes 1–3s.

Note on the original brief: it asked for a local Ollama instance. This implementation uses Groq
instead, so the local-model requirement is not met. The structured-output approach is identical —
a Zod schema converted with `zod-to-json-schema` and enforced through the provider's
`json_schema` response format — and swapping in Ollama only means replacing the client inside
`backend/groq.js`. The schema, routes, database layer and the entire frontend stay as they are.

## Notes on structure

API logic is encapsulated per concern: `server.js` wires HTTP only, `groq.js` owns the model call
and validation, `db.js` owns all SQL, `config.js` owns environment access. On the frontend,
`app/page.tsx` holds state and every network call goes through `lib/api.ts`, so the components in
`components/` stay presentational and take props only.
