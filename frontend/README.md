# Smart Meeting Extractor — Frontend

Next.js 14 (App Router, TypeScript) UI for pasting raw meeting notes and viewing the extracted
tasks as cards.

The API lives in a separate repository and must be running for extraction to work.

## Requirements

- Node.js 18+
- The backend API running (default `http://localhost:4000`)

## Setup

```bash
npm install
```

Create `.env.local` in this folder (shared separately, never committed):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
```

Open http://localhost:3000, click **Load sample**, then **Extract tasks**.

## Structure

```
app/
  page.tsx          state + data fetching only
  layout.tsx        root layout
components/
  NotesForm.tsx     textarea, submit, sample/clear actions
  TaskList.tsx      loading skeletons, errors, empty states
  TaskCard.tsx      single task card (task, owner, priority, due date)
lib/api.ts          API client with timeout handling
types/task.ts       shared types
```

Components are presentational and take props only. All state lives in `app/page.tsx` and every
network call goes through `lib/api.ts`, so no component talks to `fetch` directly.

## UI states

The submit button is disabled until there are at least 10 characters, matching the server's
validation so an obviously invalid request is never sent. While a request is in flight the form
is disabled and skeleton cards are shown.

Failures surface as readable messages rather than silent empty results:

| Situation            | What the user sees                                     |
| -------------------- | ------------------------------------------------------ |
| Backend not running  | "Cannot reach the API. Is the backend running…"        |
| Request over 60s     | "The request timed out. Please try again."              |
| Rate limit / API error | The message returned by the API                      |
| No tasks found       | "No actionable tasks found in these notes."             |
| Saved but DB down    | Tasks shown with a warning banner                       |

Priority is colour coded on each card (high red, medium amber, low green), with the label text
also present so the meaning does not depend on colour alone.
